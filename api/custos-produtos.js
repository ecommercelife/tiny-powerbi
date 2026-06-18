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

  const texto = await response.text();

  if (!texto) {
    throw new Error("Token vazio retornado pela Tiny");
  }

  let data;

  try {
    data = JSON.parse(texto);
  } catch {
    throw new Error(`Erro ao interpretar token: ${texto}`);
  }

  if (!data.access_token) {
    throw new Error(`Access token não retornado: ${texto}`);
  }

  return data.access_token;
}

export default async function handler(req, res) {
  try {
    const token = await getAccessToken();

    let produtos = [];
    let offset = 0;
    let total = 1;
    const limit = 100;

    while (offset < total) {
      const response = await fetch(
        `https://api.tiny.com.br/public-api/v3/produtos?limit=${limit}&offset=${offset}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const texto = await response.text();

      if (!texto) {
        throw new Error(
          `Resposta vazia ao listar produtos. Offset: ${offset}`
        );
      }

      let data;

      try {
        data = JSON.parse(texto);
      } catch {
        throw new Error(
          `Erro ao interpretar listagem de produtos: ${texto}`
        );
      }

      produtos = [...produtos, ...(data.itens || [])];

      total = data.paginacao?.total || 0;

      offset += limit;
    }

    const resultado = [];

    for (const produto of produtos) {
      try {
        const response = await fetch(
          `https://api.tiny.com.br/public-api/v3/produtos/${produto.id}/custos`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          resultado.push({
            erroProduto: produto.id,
            sku: produto.sku,
            status: response.status,
          });

          continue;
        }

        const texto = await response.text();

        if (!texto) {
          resultado.push({
            erroProduto: produto.id,
            sku: produto.sku,
            erro: "Resposta vazia",
          });

          continue;
        }

        let custos;

        try {
          custos = JSON.parse(texto);
        } catch {
          resultado.push({
            erroProduto: produto.id,
            sku: produto.sku,
            erro: "JSON inválido",
            resposta: texto,
          });

          continue;
        }

        if (!custos.itens || !Array.isArray(custos.itens)) {
          continue;
        }

        for (const custo of custos.itens) {
          resultado.push({
            idProduto: produto.id,
            sku: produto.sku,
            produto: produto.descricao,
            dataCusto: custo.data,
            precoCusto: custo.precoCusto,
            custoMedio: custo.custoMedio,
            saldoAnterior: custo.saldoAnterior,
            saldoAtual: custo.saldoAtual,
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 150));
      } catch (e) {
        resultado.push({
          erroProduto: produto.id,
          sku: produto.sku,
          erro: e.message,
        });
      }
    }

    return res.status(200).json({
      total: resultado.length,
      custos: resultado,
    });
  } catch (error) {
    return res.status(500).json({
      erro: error.message,
      stack: error.stack,
    });
  }
}
