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

function obterCustoDaVenda(dataVenda, historico) {

  if (!historico || historico.length === 0) {
    return null;
  }

  const vendaData = new Date(dataVenda);

  const custosValidos = historico
    .filter(c => new Date(c.data) <= vendaData)
    .sort((a, b) => new Date(b.data) - new Date(a.data));

  if (custosValidos.length === 0) {
    return null;
  }

  return custosValidos[0];
}

export default async function handler(req, res) {

  try {

    const token = await getAccessToken();

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

    for (const pedido of pedidos) {

      const detalheResponse = await fetch(
        `https://api.tiny.com.br/public-api/v3/pedidos/${pedido.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const detalhe = await detalheResponse.json();

      for (const item of detalhe.itens) {

        const idProduto = item.produto?.id;

        let custoUnitario = null;
        let custoMedio = null;

        try {

          const custoResponse = await fetch(
            `https://api.tiny.com.br/public-api/v3/produtos/${idProduto}/custos`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const custoData = await custoResponse.json();

          const custoHistorico = obterCustoDaVenda(
            detalhe.data,
            custoData.itens
          );

          if (custoHistorico) {
            custoUnitario = custoHistorico.precoCusto;
            custoMedio = custoHistorico.custoMedio;
          }

        } catch (e) {}

        const quantidade = item.quantidade || 0;
        const valorUnitario = item.valorUnitario || 0;

        vendas.push({

          data: detalhe.data,

          pedidoTiny: detalhe.numeroPedido,

          pedidoMarketplace:
            detalhe.ecommerce?.numeroPedidoEcommerce || "",

          canal:
            detalhe.ecommerce?.nome || "",

          notaFiscal:
            detalhe.idNotaFiscal || "",

          idProduto,

          sku:
            item.produto?.sku || "",

          produto:
            item.produto?.descricao || "",

          quantidade,

          valorUnitario,

          receitaBruta:
            quantidade * valorUnitario,

          custoUnitario,

          custoMedio,

          cmv:
            custoUnitario
              ? quantidade * custoUnitario
              : null,

          lucroBruto:
            custoUnitario
              ? (quantidade * valorUnitario) -
                (quantidade * custoUnitario)
              : null,

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
    }

    return res.status(200).json({
      total: vendas.length,
      vendas,
    });

  } catch (error) {

    return res.status(500).json({
      erro: error.message,
    });

  }
}
