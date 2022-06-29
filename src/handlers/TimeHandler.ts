import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

export const TimeHandler = (req: Request, res: Response) => {
  const timeStr = new Date().toLocaleString()
  const time = new Date().getTime()
  res.status(StatusCodes.OK).json({ timeStr, time })
}
