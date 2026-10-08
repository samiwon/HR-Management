import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import multer from 'multer'

export const RESUME_DIRECTORY = path.join(process.cwd(), 'storage', 'resumes')

fs.mkdirSync(RESUME_DIRECTORY, { recursive: true })

const allowedTypes = new Map([
  ['.pdf', ['application/pdf']],
  ['.doc', ['application/msword', 'application/octet-stream']],
  ['.docx', ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream']],
  ['.png', ['image/png']],
  ['.jpg', ['image/jpeg']],
  ['.jpeg', ['image/jpeg']],
])

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, RESUME_DIRECTORY),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase()
    callback(null, `${crypto.randomUUID()}${extension}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase()
    const mimeTypes = allowedTypes.get(extension)
    if (!mimeTypes || !mimeTypes.includes(file.mimetype)) {
      callback(new Error('Upload a PDF, DOC, DOCX, PNG, or JPG file.'))
      return
    }
    callback(null, true)
  },
})

export function handleResumeUpload(req, res, next) {
  upload.single('resume')(req, res, (error) => {
    if (!error) return next()
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400
    return res.status(status).json({
      message: error.code === 'LIMIT_FILE_SIZE'
        ? 'Resume files must be 10 MB or smaller.'
        : error.message || 'Unable to upload resume.',
    })
  })
}

export function getResumeFilePath(storageName) {
  if (!storageName || path.basename(storageName) !== storageName) return null
  return path.join(RESUME_DIRECTORY, storageName)
}