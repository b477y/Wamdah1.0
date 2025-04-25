const errorHandlingMiddleware = (error, req, res, next) => {
  if (process.env.MODE === "DEVELOPMENT") {
    return res
      .status(error.cause || 400)
      .json({ message: error.message, error, stack: error.stack });
  }
  return res
    .status(error.cause || 400)
    .json({ success: false, message: error.message });
};

export default errorHandlingMiddleware;
