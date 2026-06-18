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
  try {

    const token = await getAccessToken();

    // Busca apenas 1 pedido
    const response = await fetch(
      "https://api.tiny.com.br/public-api/v3/pedidos?limit=1",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const pedidos = await response.json();

    const primeiroPedido = pedidos.itens[0];

    // Busca o detalhe desse pedido
    const detalheResponse = await fetch(
      `https://api.tiny.com.br/public-api/v3/pedidos/${primeiroPedido.id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const detalhe = await detalheResponse.json();

    return res.status(200).json({
      pedidoId: primeiroPedido.id,
      detalhe
    });

  } catch (error) {

    return res.status(500).json({
      erro: error.message,
      stack: error.stack
    });

  }
}
