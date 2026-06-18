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

      const data = await response.json();

      produtos = [...produtos, ...data.itens];

      total = data.paginacao.total;
      offset += limit;
    }

    const historico = [];

    for (const produto of produtos) {

      const response = await fetch(
        `https://api.tiny.com.br/public-api/v3/produtos/${produto.id}/custos`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {

        historico.push({
          idProduto: produto.id,
          sku: produto.sku,
          status: response.status
        });

        continue;
      }

      const texto = await response.text();

      if (!texto) {

        historico.push({
          idProduto: produto.id,
          sku: produto.sku,
          erro: "Resposta vazia"
        });

        continue;
      }

      let custos;

      try {

        custos = JSON.parse(texto);

      } catch {

        historico.push({
          idProduto: produto.id,
          sku: produto.sku,
          erro: "JSON inválido"
        });

        continue;
      }

      if (!custos.itens) {
        continue;
      }

      for (const custo of custos.itens) {

        historico.push({

          idProduto: produto.id,

          sku: produto.sku,

          produto: produto.descricao,

          dataCusto: custo.data,

          precoCusto: custo.precoCusto,

          custoMedio: custo.custoMedio,

          saldoAnterior: custo.saldoAnterior,

          saldoAtual: custo.saldoAtual

        });

      }

      await new Promise(resolve =>
        setTimeout(resolve, 100)
      );
    }

    return res.status(200).json({
      total: historico.length,
      historico
    });

  } catch (error) {

    return res.status(500).json({
      erro: error.message,
      stack: error.stack
    });

  }

}
