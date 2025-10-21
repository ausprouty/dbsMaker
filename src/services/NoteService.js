import { unref } from 'vue'
import { normId, normIntish } from 'src/utils/normalize'
import { useContentStore } from '../stores/ContentStore'
import { buildNotesKey } from 'src/utils/ContentKeyBuilder'
import {
  getNoteFromDB,
  saveNoteToDB,
  deleteNoteFromDB
} from './IndexedDBService'

const ALLOWED_SECTIONS = new Set([
  'video',
  'look_back',
  'look_up',
  'look_forward',
])

export async function getNote(study, lesson, section) {
  const studyId = normId(study)
  const lessonId = normIntish(lesson)
  const sectionId = String(section).trim()

  if (!studyId || !lessonId || !ALLOWED_SECTIONS.has(sectionId)) {
    console.error('getNote missing/invalid params', {
      study,
      lesson,
      section,
    })
    return ''
  }

  const store = useContentStore()
  store.lessonContent ||= {}

  const key = buildNotesKey(studyId, lessonId, sectionId)

  if (store.lessonContent[key] !== undefined) {
    return store.lessonContent[key]
  }

  const note = await getNoteFromDB(studyId, lessonId, sectionId)
  if (note !== undefined) {
    store.lessonContent[key] = note
    return note
  }

  return ''
}

export async function saveNote(study, lesson, section, content) {
  const studyId = normId(study)
  const lessonId = normIntish(lesson)
  const sectionId = String(section).trim()
  const text = String(unref(content) ?? '')

  if (!studyId || !lessonId || !ALLOWED_SECTIONS.has(sectionId)) {
    console.error('saveNote missing/invalid params', {
      study,
      lesson,
      section,
    })
    return
  }

  const store = useContentStore()
  store.lessonContent ||= {}

  const key = buildNotesKey(studyId, lessonId, sectionId)
  store.lessonContent[key] = text
  await saveNoteToDB(studyId, lessonId, sectionId, text)
}

export async function deleteNote(study, lesson, section) {
  const studyId = normId(study)
  const lessonId = normIntish(lesson)
  const sectionId = String(section).trim()

  if (!studyId || !lessonId || !ALLOWED_SECTIONS.has(sectionId)) {
    console.error('deleteNote missing/invalid params', {
      study,
      lesson,
      section,
    })
    return
  }

  const store = useContentStore()
  store.lessonContent ||= {}

  const key = buildNotesKey(studyId, lessonId, sectionId)
  delete store.lessonContent[key]
  await deleteNoteFromDB(studyId, lessonId, sectionId)
}
