export default async function handler(req, res) {

  try {

    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        erro: "Code não informado"
      });
    }

    const basic = Buffer.from(
      `${process.env.TINY_CLIENT_ID}:${process.env.TINY_CLIENT_SECRET}`
    ).toString("base64");

    const params = new URLSearchParams();

    params.append(
      "grant_type",
      "authorization_code"
    );

    params.append(
      "redirect_uri",
      "https://tiny-powerbi.vercel.app/api/callback"
    );

    params.append(
      "code",
      code
    );

    const tokenResponse = await fetch(
      "https://accounts.tiny.com.br/realms/tiny/protocol/openid-connect/token",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
          Authorization:
            `Basic ${basic}`
        },
        body: params
      }
    );

    const tokenData =
      await tokenResponse.json();

    if (!tokenData.refresh_token) {

      return res.status(500).json({
        erro: "Tiny não retornou refresh token",
        retorno: tokenData
      });

    }

    const supabaseUrl =
      process.env.SUPABASE_URL;

    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    await fetch(
      `${supabaseUrl}/rest/v1/configuracoes_tiny_laluc?chave=eq.refresh_token`,
      {
        method: "PATCH",
        headers: {
          apikey: supabaseKey,
          Authorization:
            `Bearer ${supabaseKey}`,
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          valor:
            tokenData.refresh_token,
          atualizado_em:
            new Date().toISOString()
        })
      }
    );

    return res.status(200).json({

      sucesso: true,

      mensagem:
        "Refresh token atualizado no Supabase",

      atualizado_em:
        new Date().toISOString()

    });

  } catch (error) {

    return res.status(500).json({

      erro:
        error.message

    });

  }

}
