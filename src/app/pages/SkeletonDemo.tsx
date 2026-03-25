import { useState } from 'react';
import CardSkeleton from '../components/ui/CardSkeleton';
import TextSkeleton from '../components/ui/TextSkeleton';
import TableSkeleton from '../components/ui/TableSkeleton';

export default function SkeletonDemo() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Skeleton Loader Demo</h1>
        <p className="mt-2 text-sm text-gray-600">
          Reusable loading placeholders for cards, text content, and tables.
        </p>

        <button
          type="button"
          onClick={() => setIsLoading((prev) => !prev)}
          className="mt-4 rounded-md bg-[#1E3A8A] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a3277]"
        >
          Toggle loading: {isLoading ? 'ON' : 'OFF'}
        </button>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Card / Product Tile Skeleton</h2>
        <p className="text-sm text-gray-600">Use count to render multiple card placeholders.</p>

        {/* Swap this with real cards once API data is ready: isLoading ? <CardSkeleton /> : <CardGrid data={data} /> */}
        {isLoading ? (
          <CardSkeleton count={6} lines={2} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {['Pollution', 'Noise', 'Crime', 'Road Hazard', 'Other'].map((label) => (
              <article key={label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="h-36 rounded-lg bg-gray-100" />
                <h3 className="mt-4 text-sm font-semibold text-gray-900">{label} Incident</h3>
                <p className="mt-1 text-sm text-gray-600">Example loaded card content.</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Text / Article Skeleton</h2>
        <p className="text-sm text-gray-600">Use rows to mimic variable text content length.</p>

        {/* Swap this with real text content once the article/description endpoint resolves. */}
        {isLoading ? (
          <TextSkeleton rows={6} title />
        ) : (
          <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-xl font-semibold text-gray-900">Community Safety Bulletin</h3>
            <p className="mt-3 text-sm leading-6 text-gray-700">
              Barangay officials can publish timely updates and emergency reminders here. This block
              demonstrates how content replaces the skeleton after data loads.
            </p>
          </article>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Table / List Skeleton</h2>
        <p className="text-sm text-gray-600">Use rows and columns for report queues and data tables.</p>

        {/* Swap this with your real table once list/query data is available. */}
        {isLoading ? (
          <TableSkeleton rows={5} columns={5} showHeader />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full border-collapse text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3">Ticket ID</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Barangay</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['INC-251-0041', 'Noise', '251', 'Under Review', '2 mins ago'],
                  ['INC-252-0019', 'Pollution', '252', 'In Progress', '10 mins ago'],
                  ['INC-256-0007', 'Road Hazard', '256', 'Resolved', '18 mins ago'],
                ].map((row) => (
                  <tr key={row[0]} className="border-b border-gray-100 last:border-b-0">
                    {row.map((cell) => (
                      <td key={`${row[0]}-${cell}`} className="px-4 py-3 text-gray-700">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
