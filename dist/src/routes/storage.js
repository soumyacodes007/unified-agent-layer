import { Router } from 'express';
import { PinataSDK } from 'pinata';
import multer from 'multer';
import { config } from '../config.js';
const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB limit
// ─── POST /v1/storage ─────────────────────────────────────────────────────────
// Uploads a file to IPFS via Pinata.
// Returns IPFS hash and a public gateway URL.
router.post('/v1/storage', upload.single('file'), async (req, res) => {
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
        const upload = await pinata.upload.file(file);
        const gatewayUrl = `https://${config.providers.pinata.gateway}/ipfs/${upload.cid}`;
        res.json({
            ipfs_hash: upload.cid,
            gateway_url: gatewayUrl,
            ipfs_url: `ipfs://${upload.cid}`,
            filename: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            provider: 'pinata',
        });
    }
    catch (err) {
        console.error('[storage] Pinata error:', err);
        const msg = err instanceof Error ? err.message : String(err);
        res.status(502).json({ error: 'IPFS upload failed', details: msg });
    }
});
export default router;
