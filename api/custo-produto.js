async function getAccessToken() {
  const params = new URLSearchParams();

  params.append("grant_type", "refresh_token");
  params.append("client_id", process.env.TINY_CLIENT_ID);
  params.append("client_secret", process.env.TINY_CLIENT_SECRET);
  params.append("refresh_token", process.env.TINY_REFRESH_TOKEN);

  const response = await fetch(
    "https://accounts.tiny.com.br/realms/tiny/protocol/openid-connect/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    }
  );

  const data = await response.json();

  return data.access_token;
}

export default async function handler(req, res) {

  const token = await getAccessToken();

  const response = await fetch(
    "https://api.tiny.com.br/public-api/v3/produtos/345335461/custos",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const texto = await response.text();

  return res.status(200).send(texto);
}
