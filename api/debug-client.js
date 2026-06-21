export default async function handler(req, res) {

  return res.status(200).json({

    clientIdExiste:
      !!process.env.TINY_CLIENT_ID,

    clientSecretExiste:
      !!process.env.TINY_CLIENT_SECRET,

    clientIdInicio:
      process.env.TINY_CLIENT_ID
        ? process.env.TINY_CLIENT_ID.substring(0, 20)
        : null

  });

}
