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

export async function sendOtpSms(input: { phoneNumber: string; otpCode: string }) {
	if (env.otpDeliveryMode === "mock") {
		return;
	}

	await sendViaSemaphore(input.phoneNumber, buildOtpMessage(input.otpCode));
}
