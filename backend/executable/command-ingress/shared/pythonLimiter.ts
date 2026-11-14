import os from "os";

/**
 * Giới hạn số tiến trình Python (OCR/STT/DOCX/PDF) chạy đồng thời để tránh
 * chiếm hết CPU/RAM của server Node. Các yêu cầu dư sẽ xếp hàng (FIFO).
 */
export class ConcurrencyLimiter {
  private active = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly max: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.max) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.active++;
    try {
      return await task();
    } finally {
      this.active--;
      this.queue.shift()?.();
    }
  }
}

const fromEnv = Number(process.env.PYTHON_CONCURRENCY);
const defaultMax = Math.max(1, Math.floor(os.cpus().length / 2));

export const pythonLimiter = new ConcurrencyLimiter(
  Number.isInteger(fromEnv) && fromEnv > 0 ? fromEnv : defaultMax
);
