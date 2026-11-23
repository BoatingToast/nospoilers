'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import PageHeader from '@/components/ui/PageHeader'
import { DEFAULT_FACETS, MEDIA_TYPES } from '@/lib/audience-engine'
import { audienceRequest, FacetInputs, fieldClass, Panel } from './Analytics'

type Variant = { label: string; headline: string; concept: string; uploadId: string }

export default function StudyBuilder() {
  const router = useRouter()
  const [title, setTitle] = useState(''),
    [description, setDescription] = useState('')
  const [workKey, setWorkKey] = useState('')
  const [mediaType, setMediaType] = useState('film'),
    [rightsNote, setRightsNote] = useState('')
  const [rightsConfirmed, setRightsConfirmed] = useState(false),
    [discoverable, setDiscoverable] = useState(false)
  const [facets, setFacets] = useState({ ...DEFAULT_FACETS })
  const [variants, setVariants] = useState<Variant[]>([
    { label: 'Preview A', headline: '', concept: '', uploadId: '' },
  ])
  const [uploads, setUploads] = useState<Array<{ id: string; title: string }>>([])
  const [uploadError, setUploadError] = useState(''),
    [error, setError] = useState(''),
    [saving, setSaving] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    audienceRequest<{ uploads: Array<{ id: string; title: string }> }>('/api/audience/uploads', {
      signal: controller.signal,
    })
      .then((data) => setUploads(data.uploads))
      .catch(() => {
        if (!controller.signal.aborted)
          setUploadError('Video uploads could not be loaded. You can still create a text preview.')
      })
    return () => controller.abort()
  }, [])
  function updateVariant(index: number, key: keyof Variant, value: string) {
    setVariants((rows) => rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)))
  }
  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const created = await audienceRequest<{ id: string }>('/api/audience/projects', {
        method: 'POST',
        body: JSON.stringify({
          title,
          workKey,
          description,
          mediaType,
          rightsNote,
          rightsConfirmed,
          discoverable,
          targetFacets: facets,
          variants,
        }),
      })
      router.push(`/creator/audience/${created.id}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create study.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="space-y-8">
      <PageHeader
        title="Set up a study."
        description="One work, a clear introduction, and real audience feedback. Review your draft before collecting responses."
      />
      <form onSubmit={save} className="space-y-6">
        <Panel
          title="The release"
          description="This description appears before consent. Keep it free of story reveals."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              id="study-title"
              label="Study title"
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Your upcoming release"
            />
            <div>
              <label
                htmlFor="study-medium"
                className="mb-1.5 block text-sm font-semibold text-ns-text"
              >
                Medium
              </label>
              <select
                id="study-medium"
                className={fieldClass}
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value)}
              >
                {MEDIA_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Input
                id="study-work-key"
                label="Stable work ID"
                required
                maxLength={120}
                value={workKey}
                onChange={(e) => setWorkKey(e.target.value)}
                placeholder="Your internal release ID, such as before-the-tide-2026"
                aria-describedby="work-key-help"
              />
              <p id="work-key-help" className="mt-2 text-sm leading-relaxed text-ns-muted">
                Reuse this ID for every study of the same work in your account. It keeps audience
                evidence together and prevents the same work appearing in both training and
                evaluation.
              </p>
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="study-description"
                className="mb-1.5 block text-sm font-semibold text-ns-text"
              >
                Participant introduction
              </label>
              <textarea
                id="study-description"
                className={fieldClass}
                rows={3}
                required
                maxLength={1200}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell people what they will be previewing, without giving away the story."
              />
            </div>
          </div>
        </Panel>
        <Panel
          title="Preview variants"
          description="Each participant receives one randomly assigned variant. Text concepts work immediately; videos use your existing private uploads."
        >
          {variants.map((variant, i) => (
            <fieldset key={i} className="mb-6 space-y-4 rounded-xl bg-ns-surface-2 p-5">
              <legend className="px-1 text-base font-semibold text-ns-text">
                {variant.label || `Preview ${i + 1}`}
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id={`variant-${i}-label`}
                  label="Internal label"
                  required
                  maxLength={60}
                  value={variant.label}
                  onChange={(e) => updateVariant(i, 'label', e.target.value)}
                />
                <Input
                  id={`variant-${i}-headline`}
                  label="Headline shown to participants"
                  required
                  maxLength={180}
                  value={variant.headline}
                  onChange={(e) => updateVariant(i, 'headline', e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor={`variant-${i}-concept`}
                  className="mb-1.5 block text-sm font-semibold text-ns-text"
                >
                  Preview text
                </label>
                <textarea
                  id={`variant-${i}-concept`}
                  rows={4}
                  maxLength={5000}
                  className={fieldClass}
                  value={variant.concept}
                  onChange={(e) => updateVariant(i, 'concept', e.target.value)}
                  placeholder="A description, sample, or concept you have permission to share."
                />
              </div>
              <div>
                <label
                  htmlFor={`variant-${i}-upload`}
                  className="mb-1.5 block text-sm font-semibold text-ns-text"
                >
                  Video preview (optional)
                </label>
                <select
                  id={`variant-${i}-upload`}
                  className={fieldClass}
                  value={variant.uploadId}
                  onChange={(e) => updateVariant(i, 'uploadId', e.target.value)}
                >
                  <option value="">Text preview only</option>
                  {uploads.map((upload) => (
                    <option key={upload.id} value={upload.id}>
                      {upload.title}
                    </option>
                  ))}
                </select>
              </div>
              {variants.length > 1 && (
                <Button
                  variant="ghost"
                  onClick={() => setVariants((rows) => rows.filter((_, index) => i !== index))}
                >
                  Remove {variant.label}
                </Button>
              )}
            </fieldset>
          ))}
          {uploadError && <p className="mb-4 text-sm text-ns-warning">{uploadError}</p>}
          <div className="flex flex-wrap gap-3">
            {variants.length < 3 && (
              <Button
                variant="outline"
                onClick={() =>
                  setVariants((rows) => [
                    ...rows,
                    {
                      label: `Preview ${String.fromCharCode(65 + rows.length)}`,
                      headline: '',
                      concept: '',
                      uploadId: '',
                    },
                  ])
                }
              >
                Add a comparison variant
              </Button>
            )}
            <Button variant="ghost" href="/creator#films">
              Manage video uploads
            </Button>
          </div>
        </Panel>
        <Panel
          title="Describe the experience"
          description="Rate what this work offers. These creator-supplied labels power an initial preference-alignment score; they are hypotheses for testing."
        >
          <FacetInputs value={facets} onChange={setFacets} prefix="target" />
        </Panel>
        <Panel title="Rights and recruitment">
          <div className="space-y-5">
            <Input
              id="rights-note"
              label="Asset provenance / rights note"
              required
              maxLength={600}
              value={rightsNote}
              onChange={(e) => setRightsNote(e.target.value)}
              placeholder="Original work owned by our production company; approved for preview testing."
            />
            <label className="flex items-start gap-3 text-base leading-relaxed text-ns-text">
              <input
                type="checkbox"
                required
                checked={rightsConfirmed}
                onChange={(e) => setRightsConfirmed(e.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 accent-ns-secondary"
              />
              I have permission to share and process these assets for this research.
            </label>
            <label className="flex items-start gap-3 text-base leading-relaxed text-ns-text">
              <input
                type="checkbox"
                checked={discoverable}
                onChange={(e) => setDiscoverable(e.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 accent-ns-secondary"
              />
              Let signed-in NoSpoilers members discover this study. Otherwise, only people with your
              invitation link can join.
            </label>
          </div>
        </Panel>
        {error && (
          <p role="alert" className="rounded-xl bg-ns-danger/10 p-4 text-base text-ns-danger">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={saving}>
            Create draft study
          </Button>
          <Button href="/creator/audience" variant="ghost">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
