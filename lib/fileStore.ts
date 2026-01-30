// 임시 파일 저장소 (메모리)
interface StoredFile {
  buffer: Buffer
  filename: string
  mimeType: string
  createdAt: number
}

class FileStore {
  private store: Map<string, StoredFile> = new Map()
  private readonly TTL = 5 * 60 * 1000 // 5분

  // 파일 저장
  set(id: string, file: StoredFile): void {
    this.store.set(id, file)

    // 5분 후 자동 삭제
    setTimeout(() => {
      this.delete(id)
    }, this.TTL)
  }

  // 파일 가져오기
  get(id: string): StoredFile | undefined {
    return this.store.get(id)
  }

  // 파일 삭제
  delete(id: string): boolean {
    return this.store.delete(id)
  }

  // 저장된 파일 개수
  size(): number {
    return this.store.size
  }
}

// 싱글톤 인스턴스
export const fileStore = new FileStore()
