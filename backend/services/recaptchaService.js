import axios from "axios";

export async function verifyRecaptcha(token) {

    const response = await axios.post(
        "https://www.google.com/recaptcha/api/siteverify",
        null,
        {
            params: {
                secret: process.env.RECAPTCHA_SECRET_KEY,
                response: token
            }
        }
    );

    return response.data.success;
}