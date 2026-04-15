import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { config } from "../config/index.js";

const router = Router();

const aiProxy = createProxyMiddleware({
  pathFilter: "/api/ai",
  target: config.AI_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    "^/api/ai": "/ai", // rewrite /api/ai/analyze to /ai/analyze
  },
  on: {
    error: (err, req, res) => {
      res.status(502).json({
        success: false,
        message: `AI service unavailable: ${err.message}`,
        data: null,
      });
    },
  },
});

router.use(aiProxy);

export { router as aiRouter };
