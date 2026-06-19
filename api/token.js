export default async function handler(req, res) {

  try {

    const supabaseUrl =
      process.env.SUPABASE_URL;

    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Lê refresh token atual

    const refreshResponse = await fetch(
      `${supabaseUrl}/rest/v1/configuracoes_tiny_laluc?chave=eq.refresh_token&select=*`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`
        }
      }
    );

    const refreshData =
      await refreshResponse.json();

    if (!refreshData.length) {

      return res.status(500).json({
        erro: "Refresh token não encontrado no Supabase"
      });

    }

    const refreshToken =
      refreshData[0].valor;

    // Gera novo access token

    const params =
      new URLSearchParams();

    params.append(
      "grant_type",
      "refresh_token"
    );

    params.append(
      "client_id",
      process.env.TINY_CLIENT_ID
    );

    params.append(
      "client_secret",
      process.env.TINY_CLIENT_SECRET
    );

    params.append(
      "refresh_token",
      refreshToken
    );

    const tinyResponse =
      await fetch(
        "https://accounts.tiny.com.br/realms/tiny/protocol/openid-connect/token",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded"
          },
          body: params
        }
      );

    const tinyData =
      await tinyResponse.json();

    if (!tinyData.access_token) {

      return res.status(500).json(
        tinyData
      );

    }

    // Atualiza refresh token novo

    if (tinyData.refresh_token) {

      await fetch(
        `${supabaseUrl}/rest/v1/configuracoes_tiny_laluc?chave=eq.refresh_token`,
        {
          method: "PATCH",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            valor:
              tinyData.refresh_token,
            atualizado_em:
              new Date().toISOString()
          })
        }
      );

    }

    return res.status(200).json({

      access_token:
        tinyData.access_token,

      expires_in:
        tinyData.expires_in,

      atualizado:
        !!tinyData.refresh_token

    });

  } catch (error) {

    return res.status(500).json({

      erro: error.message

    });

  }

}
