export const errorHandler = (err, req, res, next) => {
  console.error(err.message);
  console.error(err.stack);


  let statusCode;
  if (err.type && err.type.startsWith('Stripe')) {

    statusCode = err.statusCode === 404 ? 404 : 502;
  } else {
    statusCode = err.statusCode || err.status || 500;
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    data: null,
  });
};
