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

  if (!data.access_token) {
    throw new Error("Não foi possível obter o access token");
  }

  return data.access_token;
}

function obterCustoDaVenda(dataVenda, historico) {

  if (!historico || historico.length === 0) {
    return null;
  }

  const venda = String(dataVenda).substring(0, 10);

  const custosValidos = historico
    .filter(c => String(c.data).substring(0, 10) <= venda)
    .sort((a, b) =>
      String(b.data).localeCompare(String(a.data))
    );

  if (custosValidos.length === 0) {
    return null;
  }

  return custosValidos[0];
}

function arredondar(valor) {

  if (valor === null || valor === undefined) {
    return null;
  }

  return Number(Number(valor).toFixed(2));
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

      if (!response.ok) {
        throw new Error(`Erro ao listar pedidos: ${response.status}`);
      }

      const data = await response.json();

      pedidos = [...pedidos, ...(data.itens || [])];

      total = data.paginacao?.total || 0;

      offset += limit;
    }

    const cacheCustos = {};

    const vendas = [];

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

      if (!detalhe.itens || detalhe.itens.length === 0) {
        continue;
      }

      for (const item of detalhe.itens) {

        const idProduto = item.produto?.id;

        let custoUnitario = null;
        let custoMedio = null;

        if (idProduto) {

          if (!cacheCustos[idProduto]) {

            try {

              const custoResponse = await fetch(
                `https://api.tiny.com.br/public-api/v3/produtos/${idProduto}/custos`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              if (custoResponse.ok) {

                const texto = await custoResponse.text();

                if (texto) {

                  try {

                    cacheCustos[idProduto] = JSON.parse(texto);

                  } catch {

                    cacheCustos[idProduto] = {
                      itens: []
                    };

                  }

                } else {

                  cacheCustos[idProduto] = {
                    itens: []
                  };

                }

              } else {

                cacheCustos[idProduto] = {
                  itens: []
                };

              }

            } catch {

              cacheCustos[idProduto] = {
                itens: []
              };

            }

          }

          const historico = cacheCustos[idProduto];

          const custoHistorico = obterCustoDaVenda(
            detalhe.data,
            historico.itens
          );

          if (custoHistorico) {

            custoUnitario = custoHistorico.precoCusto;
            custoMedio = custoHistorico.custoMedio;

          }

        }

        const quantidade = Number(item.quantidade || 0);
        const valorUnitario = Number(item.valorUnitario || 0);

        const receitaBruta =
          quantidade * valorUnitario;

        const cmv =
          custoUnitario !== null
            ? quantidade * custoUnitario
            : null;

        const lucroBruto =
          cmv !== null
            ? receitaBruta - cmv
            : null;

        vendas.push({

          data: detalhe.data,

          idProduto,

          pedidoTiny:
            detalhe.numeroPedido,

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

          quantidade,

          valorUnitario:
            arredondar(valorUnitario),

          receitaBruta:
            arredondar(receitaBruta),

          custoUnitario:
            arredondar(custoUnitario),

          custoMedio:
            arredondar(custoMedio),

          cmv:
            arredondar(cmv),

          lucroBruto:
            arredondar(lucroBruto),

          valorFrete:
            arredondar(detalhe.valorFrete || 0),

          valorDesconto:
            arredondar(detalhe.valorDesconto || 0),

          valorOutrasDespesas:
            arredondar(detalhe.valorOutrasDespesas || 0),

          cidade:
            detalhe.cliente?.endereco?.municipio || "",

          uf:
            detalhe.cliente?.endereco?.uf || ""

        });

      }
    }

    return res.status(200).json({
      total: vendas.length,
      produtosComCache: Object.keys(cacheCustos).length,
      vendas
    });

  } catch (error) {

    return res.status(500).json({
      erro: error.message,
      stack: error.stack
    });

  }

}
