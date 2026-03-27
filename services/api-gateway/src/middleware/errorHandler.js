export const errorHandler = (err, req, res, next) => {
  console.error(`[API Gateway Error] ${err.message}`);

  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Gateway error',
    data: null,
  });
};
