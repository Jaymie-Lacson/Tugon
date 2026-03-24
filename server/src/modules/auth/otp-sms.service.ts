import { env } from "../../config/env.js";

const DEFAULT_SEMAPHORE_API_URL = "https://semaphore.co/api/v4/messages";

export class OtpSmsDeliveryError extends Error {
	status: number;

	constructor(message: string, status = 502) {
		super(message);
		this.status = status;
	}
}

function buildOtpMessage(otpCode: string) {
	return `TUGON OTP: ${otpCode}. It expires in ${env.otpExpiryMinutes} minutes. Do not share this code.`;
}

function normalizeSmsApiUrl(url: string) {
	return (url || DEFAULT_SEMAPHORE_API_URL).trim() || DEFAULT_SEMAPHORE_API_URL;
}

function compactBodyPreview(body: string) {
	return body.replace(/\s+/g, " ").trim().slice(0, 220);
}

function normalizePhoneForInfobip(phoneNumber: string) {
	const digitsOnly = phoneNumber.replace(/\D/g, "");

	if (digitsOnly.startsWith("63") && digitsOnly.length === 12) {
		return `+${digitsOnly}`;
	}

	if (digitsOnly.startsWith("0") && digitsOnly.length === 11) {
		return `+63${digitsOnly.slice(1)}`;
	}

	if (digitsOnly.startsWith("9") && digitsOnly.length === 10) {
		return `+63${digitsOnly}`;
	}

	if (phoneNumber.trim().startsWith("+")) {
		return phoneNumber.trim();
	}

	return `+${digitsOnly}`;
}

async function sendViaSemaphore(phoneNumber: string, message: string) {
	if (!env.semaphoreApiKey) {
		throw new OtpSmsDeliveryError(
			"OTP SMS delivery is not configured. Set SEMAPHORE_API_KEY in the server environment.",
			503,
		);
	}

	const form = new URLSearchParams();
	form.set("apikey", env.semaphoreApiKey);
	form.set("number", phoneNumber);
	form.set("message", message);

	if (env.semaphoreSenderName) {
		form.set("sendername", env.semaphoreSenderName);
	}

	let response: Response;
	try {
		response = await fetch(normalizeSmsApiUrl(env.semaphoreApiUrl), {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: form.toString(),
		});
	} catch (error) {
		console.error("[OTP-SMS] Failed to reach Semaphore API:", error);
		throw new OtpSmsDeliveryError("Failed to reach SMS provider. Please try again.", 502);
	}

	const responseBody = await response.text();
	if (!response.ok) {
		console.error("[OTP-SMS] Semaphore error response:", response.status, responseBody);
		throw new OtpSmsDeliveryError(
			`SMS provider rejected OTP request (${response.status}): ${compactBodyPreview(responseBody)}`,
			502,
		);
	}
}

async function sendViaInfobip(phoneNumber: string, message: string) {
	const baseUrl = env.infobipBaseUrl.replace(/\/+$/, "");
	const requestBody = {
		messages: [
			{
				from: env.infobipSenderId,
				destinations: [
					{
						to: normalizePhoneForInfobip(phoneNumber),
					},
				],
				text: message,
			},
		],
	};

	let response: Response;
	try {
		response = await fetch(`${baseUrl}/sms/2/text/advanced`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `App ${env.infobipApiKey}`,
			},
			body: JSON.stringify(requestBody),
		});
	} catch (error) {
		console.error("[OTP-SMS] Failed to reach Infobip API:", error);
		throw new OtpSmsDeliveryError("Failed to reach SMS provider. Please try again.", 502);
	}

	const responseBody = await response.text();
	if (!response.ok) {
		console.error("[OTP-SMS] Infobip error response:", response.status, responseBody);
		throw new OtpSmsDeliveryError(
			`SMS provider rejected OTP request (${response.status}): ${compactBodyPreview(responseBody)}`,
			502,
		);
	}
}

export async function sendOtpSms(input: { phoneNumber: string; otpCode: string }) {
	if (env.otpDeliveryMode === "mock") {
		return;
	}

	const message = buildOtpMessage(input.otpCode);

	if (env.otpSmsProvider === "infobip") {
		await sendViaInfobip(input.phoneNumber, message);
		return;
	}

	await sendViaSemaphore(input.phoneNumber, message);
}
