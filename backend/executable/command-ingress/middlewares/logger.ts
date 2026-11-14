import appLogger from "../../../lib/logger";
import {NextFunction, Request, Response} from 'express';

const logger = (req: Request, res: Response, next: NextFunction) => {
    appLogger.info(req.originalUrl);
    next();
};

export default logger;
