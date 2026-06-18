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

    // Buscar todos os pedidos
    let pedidos = [];
    let offset = 0;
    let total = 1;
    const limit = 100;

    while (offset < total) {

      const response = await fetch(
        `https://api.tiny.com.br/public-api/v3/pedidos?limit=${limit}&offset=${offset}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      pedidos = [...pedidos, ...data.itens];

      total = data.paginacao.total;
      offset += limit;
    }

    let vendas = [];

    // Buscar detalhes de cada pedido
    for (const pedido of pedidos) {

      const detalheResponse = await fetch(
        `https://api.tiny.com.br/public-api/v3/pedidos/${pedido.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!detalheResponse.ok) {
        continue;
      }

      const detalhe = await detalheResponse.json();

      if (!detalhe.itens) {
        continue;
      }

      for (const item of detalhe.itens) {

        vendas.push({

          data: detalhe.data,

          pedidoTiny: detalhe.numeroPedido,

          pedidoMarketplace:
            detalhe.ecommerce?.numeroPedidoEcommerce || "",

          canal:
            detalhe.ecommerce?.nome || "",

          notaFiscal:
            detalhe.idNotaFiscal || "",

          sku:
            item.produto?.sku || "",

          produto:
            item.produto?.descricao || "",

          quantidade:
            item.quantidade || 0,

          valorUnitario:
            item.valorUnitario || 0,

          valorProdutos:
            detalhe.valorTotalProdutos || 0,

          valorFrete:
            detalhe.valorFrete || 0,

          valorDesconto:
            detalhe.valorDesconto || 0,

          valorOutrasDespesas:
            detalhe.valorOutrasDespesas || 0,

          cidade:
            detalhe.cliente?.endereco?.municipio || "",

          uf:
            detalhe.cliente?.endereco?.uf || ""

        });

      }

      // evita rate limit do Tiny
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    return res.status(200).json({
      total: vendas.length,
      vendas
    });

  } catch (error) {

    return res.status(500).json({
      erro: error.message,
      stack: error.stack
    });

  }
}
