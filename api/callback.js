export default async function handler(req, res) {
  const { code } = req.query;

  const basic = Buffer.from(
    `${process.env.TINY_CLIENT_ID}:${process.env.TINY_CLIENT_SECRET}`
  ).toString("base64");

  const params = new URLSearchParams();

  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", "https://tiny-powerbi.vercel.app/api/callback");
  params.append("code", code);

  const response = await fetch(
    "https://accounts.tiny.com.br/realms/tiny/protocol/openid-connect/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`
      },
      body: params
    }
  );

  const data = await response.json();

  return res.status(response.status).json(data);
}
