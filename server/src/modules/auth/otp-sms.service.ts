import { env } from "../../config/env.js";

const PHILSMS_SEND_URL = "https://dashboard.philsms.com/api/v3/sms/send";

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

function compactBodyPreview(body: string) {
	return body.replace(/\s+/g, " ").trim().slice(0, 220);
}

/**
 * Normalizes a Philippine phone number to the format required by PhilSMS: 639XXXXXXXXX
 * (no leading +, no leading 0).
 */
function normalizePhoneForPhilSms(phoneNumber: string) {
	const digitsOnly = phoneNumber.replace(/\D/g, "");

	// Already in 63XXXXXXXXXX format (12 digits)
	if (digitsOnly.startsWith("63") && digitsOnly.length === 12) {
		return digitsOnly;
	}

	// 0XXXXXXXXX format (11 digits)
	if (digitsOnly.startsWith("0") && digitsOnly.length === 11) {
		return `63${digitsOnly.slice(1)}`;
	}

	// 9XXXXXXXXX format (10 digits)
	if (digitsOnly.startsWith("9") && digitsOnly.length === 10) {
		return `63${digitsOnly}`;
	}

	// Already has +63 prefix
	if (phoneNumber.trim().startsWith("+63")) {
		return digitsOnly;
	}

	return digitsOnly;
}

async function sendViaPhilSms(phoneNumber: string, message: string) {
	if (!env.philSmsApiToken) {
		throw new OtpSmsDeliveryError(
			"OTP SMS delivery is not configured. Set PHILSMS_API_TOKEN in the server environment.",
			503,
		);
	}

	if (!env.philSmsSenderId) {
		throw new OtpSmsDeliveryError(
			"OTP SMS delivery is not configured. Set PHILSMS_SENDER_ID in the server environment.",
			503,
		);
	}

	const recipient = normalizePhoneForPhilSms(phoneNumber);

	console.log(`[OTP-SMS] PhilSMS send → recipient=${recipient} sender_id=${env.philSmsSenderId} token_len=${env.philSmsApiToken.length} token_preview=${env.philSmsApiToken.slice(0, 6)}...`);
	let response: Response;
	try {
		response = await fetch(PHILSMS_SEND_URL, {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${env.philSmsApiToken}`,
				"Content-Type": "application/json",
				"Accept": "application/json",
			},
			body: JSON.stringify({
				recipient,
				sender_id: env.philSmsSenderId,
				type: "plain",
				message,
			}),
		});
	} catch (error) {
		console.error("[OTP-SMS] Failed to reach PhilSMS API:", error);
		throw new OtpSmsDeliveryError("Failed to reach SMS provider. Please try again.", 502);
	}

	const responseBody = await response.text();
	if (!response.ok) {
		console.error("[OTP-SMS] PhilSMS error response:", response.status, responseBody);
		throw new OtpSmsDeliveryError(
			`SMS provider rejected OTP request (${response.status}): ${compactBodyPreview(responseBody)}`,
			502,
		);
	}

	// PhilSMS returns status:"success" or status:"error" in the body even on 200
	try {
		const parsed = JSON.parse(responseBody) as { status?: string; message?: string };
		if (parsed.status === "error") {
			console.error("[OTP-SMS] PhilSMS rejected message:", parsed.message);
			throw new OtpSmsDeliveryError(
				`PhilSMS rejected OTP request: ${parsed.message ?? "Unknown error"}`,
				502,
			);
		}
	} catch (parseError) {
		if (parseError instanceof OtpSmsDeliveryError) {
			throw parseError;
		}
		// Non-JSON body on a 2xx — treat as success
	}
}

export async function sendOtpSms(input: { phoneNumber: string; otpCode: string }) {
	if (env.otpDeliveryMode === "mock") {
		return;
	}

	const message = buildOtpMessage(input.otpCode);
	await sendViaPhilSms(input.phoneNumber, message);
}
