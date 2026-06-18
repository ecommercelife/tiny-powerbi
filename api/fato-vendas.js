// api/fato-vendas.js

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

    let pedidos = [];
    let offset = 0;
    let total = 1;
    const limit = 100;

    while (offset < total) {

      const detalheResponse = await fetch(
  `https://api.tiny.com.br/public-api/v3/pedidos/${pedido.id}`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

if (!detalheResponse.ok) {

  vendas.push({
    erroPedido: pedido.id,
    status: detalheResponse.status
  });

  continue;
}

const texto = await detalheResponse.text();

let detalhe;

try {
  detalhe = JSON.parse(texto);
} catch {

  vendas.push({
    erroPedido: pedido.id,
    resposta: texto
  });

  continue;
}

      const data = await response.json();

      pedidos = [...pedidos, ...data.itens];

      total = data.paginacao.total;

      offset += limit;
    }

    let vendas = [];

    for (const pedido of pedidos) {

      const detalheResponse = await fetch(
        `https://api.tiny.com.br/public-api/v3/pedidos/${pedido.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const texto = await detalheResponse.text();

let detalhe;

try {
  detalhe = JSON.parse(texto);
} catch (e) {
  vendas.push({
    erroPedido: pedido.id,
    resposta: texto
  });

  continue;
}

      detalhe.itens.forEach(item => {

        vendas.push({

          data: detalhe.data,

          idPedido: detalhe.id,

          numeroPedido: detalhe.numeroPedido,

          marketplace:
            detalhe.ecommerce?.nome || "",

          numeroPedidoMarketplace:
            detalhe.ecommerce?.numeroPedidoEcommerce || "",

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

          descontos:
            detalhe.valorDesconto || 0,

          acrescimos:
            detalhe.valorOutrasDespesas || 0,

          uf:
            detalhe.cliente?.endereco?.uf || "",

          cidade:
            detalhe.cliente?.endereco?.municipio || "",

          notaFiscal:
            detalhe.idNotaFiscal || ""

        });

      });

    }

    return res.status(200).json({
      total: vendas.length,
      vendas
    });

  } catch (error) {

    return res.status(500).json({
      erro: error.message
    });

  }
}
