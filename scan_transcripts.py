import json
import re
import shlex
from collections import Counter

with open(r'C:\Users\MIKELL~1\AppData\Local\Temp\recent_transcripts.txt', 'r') as f:
    raw_paths = [line.rstrip('\n') for line in f if line.strip()]


def to_win(p):
    if p.startswith('/') and len(p) > 2 and p[2] == '/':
        return p[1].upper() + ':' + p[2:]
    return p


paths = [to_win(p) for p in raw_paths]

ENV_RE = re.compile(r'^[A-Za-z_][A-Za-z0-9_]*=')
SKIP_WRAPPERS = {'sudo', 'timeout', 'nice', 'nohup', 'env', 'exec', 'command'}
CD_LIKE = {'cd', 'pushd', 'popd'}


def tokenize(cmd):
    try:
        return shlex.split(cmd, posix=True)
    except ValueError:
        return cmd.split()


def strip_wrappers(tokens):
    while tokens and ENV_RE.match(tokens[0]):
        tokens.pop(0)
    while tokens and tokens[0] in SKIP_WRAPPERS:
        tokens.pop(0)
        if tokens and tokens[0].startswith('-'):
            tokens.pop(0)
        if tokens and re.match(r'^[0-9]+[smh]?$', tokens[0]):
            tokens.pop(0)
    return tokens


def split_chain(tokens):
    chains = [[]]
    for t in tokens:
        if t in ('&&', '||', ';', '|'):
            chains.append([])
        else:
            chains[-1].append(t)
    return [c for c in chains if c]


def pick_main(tokens):
    chains = split_chain(tokens)
    for chain in chains:
        chain = strip_wrappers(chain[:])
        if not chain:
            continue
        if chain[0] in CD_LIKE:
            continue
        return chain
    return None


def make_label(tokens):
    """Build a more descriptive label that captures subcommand hierarchy."""
    if not tokens:
        return None
    cmd0 = tokens[0]
    if cmd0.startswith('/') or cmd0.startswith('.') or cmd0.startswith('~'):
        return None
    if len(cmd0) > 2 and cmd0[1] == ':':
        return None
    parts = [cmd0]
    # Collect first few non-flag, non-path tokens to characterize subcommand
    for t in tokens[1:5]:
        if t.startswith('-'):
            # keep distinctive short flags for some commands
            if cmd0 in ('npx',) and t == '--noEmit':
                parts.append(t)
            continue
        # Skip long paths
        if '/' in t or '\\' in t:
            break
        # Skip quoted strings (shlex removed quotes) that look like values
        if len(t) > 40:
            break
        parts.append(t)
        # Stop at 3 parts for most, 4 for npm --prefix
        if cmd0 == 'npm' and len(parts) >= 5:
            break
        if cmd0 != 'npm' and len(parts) >= 3:
            break
    return tuple(parts)


bash_counter = Counter()
bash_examples = {}
mcp_counter = Counter()

for p in paths:
    try:
        with open(p, 'r', encoding='utf-8', errors='replace') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except Exception:
                    continue
                msg = obj.get('message', {})
                if not isinstance(msg, dict):
                    continue
                content = msg.get('content', [])
                if not isinstance(content, list):
                    continue
                for item in content:
                    if not isinstance(item, dict):
                        continue
                    if item.get('type') != 'tool_use':
                        continue
                    name = item.get('name', '')
                    inp = item.get('input', {})
                    if name == 'Bash':
                        cmd = inp.get('command', '') if isinstance(inp, dict) else ''
                        if not cmd:
                            continue
                        tokens = tokenize(cmd)
                        main = pick_main(tokens)
                        if not main:
                            continue
                        key = make_label(main)
                        if not key:
                            continue
                        bash_counter[key] += 1
                        if key not in bash_examples:
                            bash_examples[key] = cmd[:180]
                    elif name.startswith('mcp__'):
                        mcp_counter[name] += 1
    except Exception:
        pass

print('=== TOP BASH COMMANDS (by label) ===')
for key, count in bash_counter.most_common(60):
    label = ' '.join(key)
    ex = bash_examples.get(key, '')
    print(f'{count:5d}  {label:<45}  ex: {ex}')

print()
print('=== TOP MCP TOOLS ===')
for name, count in mcp_counter.most_common(40):
    print(f'{count:5d}  {name}')
