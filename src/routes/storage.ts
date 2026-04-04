import { Router, type Request, type Response } from 'express';
import { PinataSDK } from 'pinata';
import multer from 'multer';
import { paymentMiddleware } from '@x402-avm/express';
import { ALGORAND_TESTNET_CAIP2 } from '@x402-avm/avm';
import { config } from '../config.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB limit

// ─── Payment Protection ───────────────────────────────────────────────────────
export function protectStorage(server: any) {
  return paymentMiddleware(
    {
      'POST /v1/storage': {
        accepts: {
          scheme: 'exact',
          network: ALGORAND_TESTNET_CAIP2,
          payTo: config.x402.avmAddress,
          price: '$0.02',
        },
        description: 'Permanent decentralized IPFS storage via Pinata',
      },
    },
    server
  );
}

// ─── POST /v1/storage ─────────────────────────────────────────────────────────
// Uploads a file to IPFS via Pinata.
router.post('/storage', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'File is required. Send as multipart/form-data field: file' });
    return;
  }

  const pinata = new PinataSDK({
    pinataJwt: config.providers.pinata.jwt,
    pinataGateway: config.providers.pinata.gateway,
  });

  try {
    const blob = new globalThis.Blob([new Uint8Array(req.file.buffer)], { type: req.file.mimetype });
    const file = new File([blob], req.file.originalname || 'upload', { type: req.file.mimetype });

    const uploadResult = await pinata.upload.file(file);
    const gatewayUrl = `https://${config.providers.pinata.gateway}/ipfs/${uploadResult.cid}`;

    res.json({
      ipfs_hash: uploadResult.cid,
      gateway_url: gatewayUrl,
      ipfs_url: `ipfs://${uploadResult.cid}`,
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      provider: 'pinata',
    });
  } catch (err: unknown) {
    console.error('[storage] Pinata error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: 'IPFS upload failed', details: msg });
  }
});

export default router;
