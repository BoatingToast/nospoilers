import type { adminOverview, eventExplorer, responseQueue } from '@/services/audience-admin'
import type { audienceDirection } from '@/services/audience-direction'
import type {
  listStudies,
  publicStudy,
  resumeStudy,
  studyReport,
  discoverStudies,
} from '@/services/audience-engine'

type Serialized<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T
export type StudyList = Serialized<Awaited<ReturnType<typeof listStudies>>>
export type StudyReport = Serialized<Awaited<ReturnType<typeof studyReport>>>
export type StudyPublic = Serialized<Awaited<ReturnType<typeof publicStudy>>>
export type StudySession = Serialized<Awaited<ReturnType<typeof resumeStudy>>>
export type AdminOverview = Serialized<Awaited<ReturnType<typeof adminOverview>>>
export type EventPage = Serialized<Awaited<ReturnType<typeof eventExplorer>>>
export type StudyOpportunities = Serialized<Awaited<ReturnType<typeof discoverStudies>>>
export type AudienceDirection = Serialized<Awaited<ReturnType<typeof audienceDirection>>>
export type AudienceResponsePage = Serialized<Awaited<ReturnType<typeof responseQueue>>>
