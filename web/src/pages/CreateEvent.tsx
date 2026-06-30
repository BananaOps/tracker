import { useState, useMemo, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { eventsApi, catalogApi } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { EventType, Priority, Status, Environment } from '../types/api'
import type { CreateEventRequest } from '../types/api'
import { convertEventForAPI } from '../lib/apiConverters'
import Toast from '../components/Toast'
import ServiceAutocomplete from '../components/ServiceAutocomplete'
import { AlertCircle, FileText, Clock, Link2, Search, Plus, Github, Ticket, Repeat } from 'lucide-react'
import { DateTimePicker } from '../components/ui/date-time-picker'
import FormPanel from '../components/FormPanel'
import ChipSelect, { type ChipOption } from '../components/ChipSelect'
import { getEnvVisual, getStatusVisual, getPriorityVisual, getTypeVisual } from '../components/Badges'
import { getEnvironmentLabel, getStatusLabel, getEventTypeLabel } from '../lib/eventUtils'
import { useFreezeWindows } from '../hooks/useFreezeWindows'
import { resolveFreezeImpact } from '../lib/freezeWindowUtils'
import { FreezeReasonBanner } from '../components/FreezeConflictBadge'

interface CreateEventProps {
  asPanel?: boolean
  onClose?: () => void
  onSuccess?: () => void
}

export default function CreateEvent({ asPanel = false, onClose, onSuccess }: CreateEventProps = {}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showToast, setShowToast] = useState(false)

  const { data: catalogData, isLoading: catalogLoading } = useQuery({
    queryKey: ['catalogs', 'list'],
    queryFn: () => catalogApi.list({ perPage: 1000 }),
  })

  const catalogServices = catalogData?.catalogs.map((c: any) => c.name).sort() || []

  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'1week' | '2weeks' | '4weeks'>('1week')
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')

  const now = new Date()
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)
  const defaultStartDate = now.toISOString()
  const defaultEndDate = oneHourLater.toISOString()

  const [formData, setFormData] = useState<CreateEventRequest>({
    title: '',
    attributes: {
      message: '',
      source: 'tracker',
      type: EventType.DEPLOYMENT,
      priority: Priority.P3,
      service: '',
      status: Status.OPEN,
      environment: Environment.PRODUCTION,
      owner: '',
      startDate: defaultStartDate,
      endDate: defaultEndDate,
    },
    links: {},
  })

  // Find downstream dependencies for the selected service
  const selectedCatalog = catalogData?.catalogs.find((c: any) => c.name === formData.attributes.service)
  const downstreamServices: string[] = selectedCatalog?.dependenciesOut || selectedCatalog?.dependencies_out || []

  // Compute freeze conflict for current scheduling inputs
  const { windows: freezeWindows } = useFreezeWindows()
  const freezeImpact = useMemo(() => {
    const startDate = formData.attributes.startDate
    const endDate = formData.attributes.endDate
    if (!startDate || !endDate) return null
    return resolveFreezeImpact(
      {
        id: '',
        title: formData.title,
        environment: formData.attributes.environment,
        serviceId: formData.attributes.service,
        startsAt: startDate,
        endsAt: endDate,
      },
      freezeWindows,
    )
  }, [formData.attributes.startDate, formData.attributes.endDate, formData.attributes.environment, formData.attributes.service, formData.title, freezeWindows])

  const createMutation = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      if (asPanel) {
        onSuccess?.()
        return
      }
      setShowToast(true)
      setTimeout(() => { navigate(-1) }, 2000)
    },
    onError: (error: any) => {
      console.error('Error creating event:', error)
    },
  })

  const getErrorMessage = () => {
    if (!createMutation.isError) return ''
    const error = createMutation.error as any
    const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error'
    if (errorMessage.includes('already locked') || errorMessage.includes('is already locked')) {
      return `🔒 Cannot create event: Service is already locked. Please check the Locks page to see who has locked it and unlock it first if needed.`
    } else if (errorMessage.toLowerCase().includes('cannot create event')) {
      return `🔒 ${errorMessage}`
    } else if (errorMessage.toLowerCase().includes('internal error')) {
      return `🔒 Cannot create event: There may be a lock conflict. Please check the Locks page.`
    }
    return `❌ Error creating event: ${errorMessage}`
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setShowToast(false)

    let startDateISO = undefined
    let endDateISO = undefined
    if (formData.attributes.startDate) {
      startDateISO = new Date(formData.attributes.startDate).toISOString()
    }
    if (formData.attributes.endDate) {
      endDateISO = new Date(formData.attributes.endDate).toISOString()
    }

    const eventData = {
      ...formData,
      attributes: {
        ...formData.attributes,
        source: 'tracker',
        startDate: startDateISO,
        endDate: endDateISO,
      },
    }

    if (isRecurring && recurrenceEndDate && startDateISO) {
      const events: any[] = []
      const startDate = new Date(formData.attributes.startDate!)
      const endDate = new Date(formData.attributes.endDate!)
      const recurrenceEnd = new Date(recurrenceEndDate)
      const intervalDays = recurrenceFrequency === '1week' ? 7 : recurrenceFrequency === '2weeks' ? 14 : 28
      let currentStart = new Date(startDate)
      let currentEnd = new Date(endDate)

      while (currentStart <= recurrenceEnd) {
        const recurringEvent = {
          ...eventData,
          title: `${formData.title} (${currentStart.toLocaleDateString()})`,
          attributes: {
            ...eventData.attributes,
            startDate: currentStart.toISOString(),
            endDate: currentEnd.toISOString(),
          },
        }
        events.push(convertEventForAPI(recurringEvent))
        currentStart = new Date(currentStart.getTime() + intervalDays * 24 * 60 * 60 * 1000)
        currentEnd = new Date(currentEnd.getTime() + intervalDays * 24 * 60 * 60 * 1000)
      }

      try {
        for (const event of events) {
          await eventsApi.create(event)
        }
        queryClient.invalidateQueries({ queryKey: ['events'] })
        if (asPanel) {
          onSuccess?.()
          return
        }
        setShowToast(true)
        setTimeout(() => { navigate(-1) }, 2000)
      } catch (error) {
        console.error('Error creating recurring events:', error)
      }
    } else {
      const apiData = convertEventForAPI(eventData)
      createMutation.mutate(apiData)
    }
  }

  const ha = (v: string, a: number) => `rgb(var(--hud-${v}) / ${a})`
  const hud = {
    surface: 'rgb(var(--hud-surface))',
    surfaceHigh: 'rgb(var(--hud-surface-high))',
    surfaceHighest: 'rgb(var(--hud-surface-highest))',
    primary: 'rgb(var(--hud-primary))',
    tertiary: 'rgb(var(--hud-tertiary))',
    onSurface: 'rgb(var(--hud-on-surface))',
    onSurfaceVar: 'rgb(var(--hud-on-surface-var))',
    outline: 'rgb(var(--hud-outline))',
    outlineVar: 'rgb(var(--hud-outline-var))',
    error: 'rgb(var(--hud-error))',
    success: 'rgb(var(--hud-success))',
  }

  const inputCls = "w-full border-0 border-b-2 border-transparent px-4 py-3 rounded-t-lg transition-all text-sm focus:outline-none"
  const inputStyle = { background: 'rgb(var(--hud-surface-low))', color: hud.onSurface }
  const labelCls = "block text-[10px] uppercase tracking-widest font-bold mb-2"

  const SectionHeader = ({ icon, title, color }: { icon: ReactNode; title: string; color?: string }) => (
    <div className="flex items-center gap-3 mb-8">
      <span style={{ color: color || hud.primary }}>{icon}</span>
      <h3 className="text-xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h3>
    </div>
  )

  // ── Badge-style option sets for the Information section ──────────────────────
  const typeOptions: ChipOption<EventType>[] = [
    EventType.DEPLOYMENT, EventType.OPERATION, EventType.DRIFT, EventType.INCIDENT, EventType.RPA_USAGE,
  ].map((v) => ({ value: v, label: getEventTypeLabel(v), visual: getTypeVisual(v) }))

  const envOptions: ChipOption<Environment>[] = [
    Environment.PRODUCTION, Environment.PREPRODUCTION, Environment.UAT, Environment.INTEGRATION, Environment.DEVELOPMENT,
  ].map((v) => ({ value: v, label: getEnvironmentLabel(v) ?? String(v), visual: getEnvVisual(v) }))

  const priorityOptions: ChipOption<Priority>[] = [
    { value: Priority.P1, label: 'P1 · Critical' },
    { value: Priority.P2, label: 'P2 · High' },
    { value: Priority.P3, label: 'P3 · Medium' },
    { value: Priority.P4, label: 'P4 · Low' },
    { value: Priority.P5, label: 'P5 · Very Low' },
  ].map((o) => ({ ...o, visual: getPriorityVisual(o.value) }))

  const statusOptions: ChipOption<Status>[] = [
    Status.OPEN, Status.PLANNED, Status.WAITING_APPROVAL, Status.IN_PROGRESS,
    Status.SUCCESS, Status.DONE, Status.FAILURE, Status.WARNING, Status.CLOSE,
  ].map((v) => {
    const vis = getStatusVisual(v)
    return { value: v, label: getStatusLabel(v), visual: vis, icon: <i className={`fa-solid ${vis.icon} text-[10px]`} /> }
  })

  const impactOptions: ChipOption<'no' | 'yes'>[] = [
    { value: 'no', label: 'No Impact', visual: { bg: '#ECFDF3', text: '#166534', border: '#BBF7D0' } },
    { value: 'yes', label: 'Impact', visual: { bg: '#FEECEC', text: '#B42318', border: '#F7C9C9' }, icon: <i className="fa-solid fa-meteor text-[10px]" /> },
  ]

  // ── Scheduling helpers (quick presets + duration shortcuts) ──────────────────
  const startMs = formData.attributes.startDate ? new Date(formData.attributes.startDate).getTime() : undefined
  const endMs = formData.attributes.endDate ? new Date(formData.attributes.endDate).getTime() : undefined
  const durationMin = startMs !== undefined && endMs !== undefined && endMs > startMs
    ? Math.round((endMs - startMs) / 60000)
    : undefined

  const formatDuration = (min: number) => {
    const d = Math.floor(min / 1440)
    const h = Math.floor((min % 1440) / 60)
    const m = min % 60
    return [d ? `${d}d` : '', h ? `${h}h` : '', m ? `${m}m` : ''].filter(Boolean).join(' ') || '0m'
  }

  const setStartDate = (date?: Date) => {
    const newStart = date?.toISOString()
    const end = formData.attributes.endDate
    const endDate = end ? new Date(end) : undefined
    setFormData({ ...formData, attributes: { ...formData.attributes, startDate: newStart, endDate: (endDate && date && date > endDate) ? newStart : end } })
  }

  const setEndDate = (date?: Date) => {
    setFormData({ ...formData, attributes: { ...formData.attributes, endDate: date?.toISOString() } })
  }

  const applyDuration = (minutes: number) => {
    const base = startMs !== undefined ? startMs : Date.now()
    const startISO = formData.attributes.startDate ?? new Date(base).toISOString()
    const endISO = new Date(base + minutes * 60000).toISOString()
    setFormData({ ...formData, attributes: { ...formData.attributes, startDate: startISO, endDate: endISO } })
  }

  const durations = [
    { label: '15m', min: 15 },
    { label: '30m', min: 30 },
    { label: '1h', min: 60 },
    { label: '2h', min: 120 },
    { label: '4h', min: 240 },
    { label: '1d', min: 1440 },
  ]

  const miniChipCls = "px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all duration-150 hover:-translate-y-px active:scale-95"
  const neutralChip = {
    background: 'rgb(var(--hud-surface-low))',
    color: hud.onSurfaceVar,
    borderColor: 'rgb(var(--hud-outline-var) / 0.6)',
  }
  const durActive = {
    background: ha('primary', 0.16),
    color: hud.primary,
    borderColor: ha('primary', 0.45),
  }

  const gridWrap = asPanel ? 'space-y-6' : 'grid grid-cols-1 md:grid-cols-12 gap-8'
  const leftCol = asPanel ? 'space-y-6' : 'md:col-span-8 space-y-8'
  const rightCol = asPanel ? 'space-y-6' : 'md:col-span-4 space-y-8'

  const body = (
    <div className={gridWrap}>

      {/* ── Left Column: Core Info ── */}
      <div className={leftCol}>

              {/* Section: Event Information */}
              <section className="p-8 rounded-xl" style={{ background: hud.surface }}>
                <SectionHeader icon={<FileText className="w-5 h-5" />} title="Event Information" />
                <div className="space-y-6">
                  <div>
                    <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Event Title <span style={{ color: hud.error }}>*</span></label>
                    <input type="text" required value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g.: Deploy Cluster-K8S-Production-V2"
                      className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Event Type</label>
                    <ChipSelect
                      ariaLabel="Event Type"
                      options={typeOptions}
                      value={formData.attributes.type as EventType}
                      onChange={(type) => setFormData({ ...formData, attributes: { ...formData.attributes, type } })}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Environment</label>
                      <ChipSelect
                        ariaLabel="Environment"
                        options={envOptions}
                        value={formData.attributes.environment as Environment}
                        onChange={(environment) => setFormData({ ...formData, attributes: { ...formData.attributes, environment } })}
                      />
                    </div>
                    <div>
                      <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Priority</label>
                      <ChipSelect
                        ariaLabel="Priority"
                        options={priorityOptions}
                        value={formData.attributes.priority as Priority}
                        onChange={(priority) => setFormData({ ...formData, attributes: { ...formData.attributes, priority } })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Initial Status</label>
                    <ChipSelect
                      ariaLabel="Initial Status"
                      options={statusOptions}
                      value={formData.attributes.status as Status}
                      onChange={(status) => setFormData({ ...formData, attributes: { ...formData.attributes, status } })}
                    />
                  </div>
                  <div>
                    <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Impact</label>
                    <ChipSelect
                      ariaLabel="Impact"
                      options={impactOptions}
                      value={formData.attributes.impact ? 'yes' : 'no'}
                      onChange={(v) => setFormData({ ...formData, attributes: { ...formData.attributes, impact: v === 'yes' } })}
                    />
                  </div>
                </div>
              </section>

              {/* Section: Technical Details */}
              <section className="p-8 rounded-xl overflow-visible relative z-10" style={{ background: hud.surface }}>
                <SectionHeader icon={<Search className="w-5 h-5" />} title="Technical Details" />
                <div className="space-y-6">
                  <div>
                    <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Message / Description <span style={{ color: hud.error }}>*</span></label>
                    <textarea required rows={4} value={formData.attributes.message}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, message: e.target.value } })}
                      placeholder="Describe the details of the intervention or observed symptoms..."
                      className={inputCls + ' resize-none'} style={inputStyle} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative z-10">
                      <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Impacted Service <span style={{ color: hud.error }}>*</span></label>
                      <ServiceAutocomplete
                        id="service"
                        value={formData.attributes.service}
                        onChange={(value) => setFormData({ ...formData, attributes: { ...formData.attributes, service: value } })}
                        services={catalogServices}
                        loading={catalogLoading}
                        required
                        placeholder="Search for a service..."
                      />
                    </div>
                    <div>
                      <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Owner <span style={{ color: hud.error }}>*</span></label>
                      <input type="text" required value={formData.attributes.owner || ''}
                        onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, owner: e.target.value } })}
                        placeholder="ex: john.doe, team-platform"
                        className={inputCls} style={inputStyle} />
                    </div>
                  </div>
                </div>
              </section>

              {/* Section: Scheduling */}
              <section className="p-8 rounded-xl" style={{ background: hud.surface }}>
                <SectionHeader icon={<Clock className="w-5 h-5" />} title="Scheduling" />
                <div className="space-y-5">

                  {/* Start + quick presets */}
                  <div>
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <label className={labelCls + ' mb-0'} style={{ color: hud.onSurfaceVar }}>Start</label>
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" className={miniChipCls} style={neutralChip}
                          onClick={() => setStartDate(new Date())}>Now</button>
                        <button type="button" className={miniChipCls} style={neutralChip}
                          onClick={() => setStartDate(new Date(Date.now() + 60 * 60 * 1000))}>+1h</button>
                        <button type="button" className={miniChipCls} style={neutralChip}
                          onClick={() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); setStartDate(d) }}>Tomorrow 9:00</button>
                      </div>
                    </div>
                    <DateTimePicker
                      date={formData.attributes.startDate ? new Date(formData.attributes.startDate) : undefined}
                      setDate={setStartDate}
                      placeholder="Select start date"
                    />
                  </div>

                  {/* Duration shortcuts */}
                  <div>
                    <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Duration</label>
                    <div className="flex flex-wrap gap-2">
                      {durations.map((d) => {
                        const active = durationMin === d.min
                        return (
                          <button key={d.min} type="button" onClick={() => applyDuration(d.min)}
                            className={miniChipCls + ' tabular-nums'}
                            style={active ? durActive : neutralChip}>
                            {d.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Estimated end + computed duration */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className={labelCls + ' mb-0'} style={{ color: hud.onSurfaceVar }}>Estimated End</label>
                      {durationMin !== undefined && (
                        <span className="text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-md"
                          style={{ background: ha('primary', 0.12), color: hud.primary }}>
                          {formatDuration(durationMin)}
                        </span>
                      )}
                    </div>
                    <DateTimePicker
                      date={formData.attributes.endDate ? new Date(formData.attributes.endDate) : undefined}
                      setDate={setEndDate}
                      placeholder="Select end date"
                    />
                  </div>
                </div>
              </section>

              {/* Freeze window conflict warning — shown when selected dates overlap a freeze */}
              {freezeImpact?.impacted && (
                <FreezeReasonBanner impact={freezeImpact} />
              )}

              {/* Section: Resources */}
              <section className="p-8 rounded-xl" style={{ background: hud.surface }}>
                <SectionHeader icon={<Link2 className="w-5 h-5" />} title="Resources" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Ticket Jira</label>
                    <div className="relative">
                      <Ticket className="absolute left-3 top-3 w-4 h-4" style={{ color: hud.onSurfaceVar }} />
                      <input type="url" value={formData.links?.ticket || ''}
                        onChange={(e) => setFormData({ ...formData, links: { ...formData.links, ticket: e.target.value } })}
                        placeholder="ex: https://jira.company.com/TRK-1234"
                        className={inputCls + ' pl-10'} style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls} style={{ color: hud.onSurfaceVar }}>GitHub PR</label>
                    <div className="relative">
                      <Github className="absolute left-3 top-3 w-4 h-4" style={{ color: hud.onSurfaceVar }} />
                      <input type="url" value={formData.links?.pullRequestLink || ''}
                        onChange={(e) => setFormData({ ...formData, links: { ...formData.links, pullRequestLink: e.target.value } })}
                        placeholder="ex: https://github.com/org/repo/pull/452"
                        className={inputCls + ' pl-10'} style={inputStyle} />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* ── Right Column: Planning ── */}
            <div className={rightCol}>

              {/* Section: Recurrence Widget */}
              <section className="p-8 rounded-xl overflow-hidden relative" style={{ background: hud.surfaceHigh }}>
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Repeat className="w-20 h-20" />
                </div>
                <div className="flex flex-col items-center text-center py-2">
                  <Repeat className="w-10 h-10 mb-4" style={{ color: isRecurring ? hud.primary : hud.success }} />
                  <h4 className="font-bold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Recurrence</h4>
                  <label className="inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="sr-only peer" />
                    <div className="relative w-14 h-7 rounded-full peer transition-colors"
                      style={{ background: isRecurring ? hud.primary : hud.surfaceHighest }}>
                      <div className="absolute top-0.5 left-[4px] bg-white rounded-full h-6 w-6 transition-transform"
                        style={{ transform: isRecurring ? 'translateX(100%)' : 'translateX(0)' }} />
                    </div>
                    <span className="ms-3 text-sm font-medium" style={{ color: hud.onSurfaceVar }}>Enable</span>
                  </label>
                  {isRecurring && (
                    <div className="w-full space-y-4 mt-6 text-left">
                      <div>
                        <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Frequency</label>
                        <select value={recurrenceFrequency} onChange={(e) => setRecurrenceFrequency(e.target.value as any)}
                          className={inputCls + ' appearance-none'} style={inputStyle} required={isRecurring}>
                          <option value="1week">Every week</option>
                          <option value="2weeks">Every 2 weeks</option>
                          <option value="4weeks">Every 4 weeks</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls} style={{ color: hud.onSurfaceVar }}>End Date</label>
                        <input type="date" value={recurrenceEndDate} onChange={(e) => setRecurrenceEndDate(e.target.value)}
                          required={isRecurring} min={formData.attributes.startDate?.slice(0, 10)}
                          className={inputCls} style={inputStyle} />
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Section: Downstream Impact */}
              {formData.attributes.service && (
                <section className="p-6 rounded-xl" style={{ background: hud.surface, borderLeft: `4px solid ${hud.error}` }}>
                  <div className="flex items-center gap-2 mb-4">
                    <i className="fa-solid fa-diagram-project text-sm" style={{ color: hud.error }} />
                    <h4 className="text-xs uppercase tracking-widest font-bold" style={{ color: hud.onSurfaceVar }}>Downstream Services</h4>
                  </div>
                  {downstreamServices.length > 0 ? (
                    <ul className="space-y-2">
                      {downstreamServices.map((svc) => (
                        <li key={svc} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                          style={{ background: 'rgb(var(--hud-surface-low))' }}>
                          <div className="w-2 h-2 rounded-full" style={{ background: hud.error }} />
                          {svc}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs" style={{ color: hud.onSurfaceVar }}>No downstream dependencies found.</p>
                  )}
                </section>
              )}
            </div>
          </div>
  )

  if (asPanel) {
    return (
      <FormPanel
        size="lg"
        icon={<FileText className="w-5 h-5" />}
        title="Create a New Event"
        subtitle="Register an operation, incident or deployment"
        onClose={() => onClose?.()}
        onSubmit={handleSubmit}
        submitLabel={createMutation.isPending ? 'Creating...' : 'Create Event'}
        submitIcon={<Plus className="w-4 h-4" />}
        submitting={createMutation.isPending}
        error={createMutation.isError ? getErrorMessage() : undefined}
      >
        {body}
      </FormPanel>
    )
  }

  return (
    <div className="min-h-full overflow-auto" style={{ background: 'rgb(var(--hud-bg))', color: hud.onSurface }}>
      <div className="max-w-5xl mx-auto p-8">
        {/* Header */}
        <div className="mb-12">
          <h2 className="text-4xl font-bold tracking-tight mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Create a New Event
          </h2>
          <p className="max-w-2xl leading-relaxed" style={{ color: hud.onSurfaceVar }}>
            Register a new operation, incident or deployment. Data accuracy ensures system integrity.
          </p>
        </div>

        {createMutation.isError && (
          <div className="flex items-start gap-3 p-4 rounded-xl mb-8" style={{ background: ha('error', 0.1), border: `1px solid ${ha('error', 0.2)}` }}>
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: hud.error }} />
            <div>
              <p className="text-sm font-medium" style={{ color: hud.error }}>{getErrorMessage()}</p>
              {getErrorMessage().includes('🔒') && (
                <p className="text-xs mt-2" style={{ color: hud.onSurfaceVar }}>
                  💡 View and manage locks on the <a href="/locks" className="underline" style={{ color: hud.primary }}>Locks page</a>
                </p>
              )}
            </div>
          </div>
        )}

        {showToast && <Toast message="Event created successfully!" onClose={() => setShowToast(false)} />}

        <form onSubmit={handleSubmit} className="space-y-8">
          {body}

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4" style={{ borderTop: `1px solid ${ha('outline-var', 0.15)}` }}>
            <button type="button" onClick={() => navigate(-1)}
              className="px-8 py-3 font-bold transition-colors hover:opacity-80"
              style={{ color: hud.onSurfaceVar, fontFamily: "'Space Grotesk', sans-serif" }}>
              Cancel
            </button>
            <button type="submit" disabled={createMutation.isPending}
              className="flex items-center gap-2 px-10 py-3 rounded-xl font-bold shadow-lg transition-all hover:opacity-90 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${hud.primary}, ${ha('primary-dim', 1)})`,
                color: 'white',
                fontFamily: "'Space Grotesk', sans-serif",
                boxShadow: `0 4px 20px ${ha('primary', 0.25)}`,
              }}>
              <Plus className="w-4 h-4" />
              {createMutation.isPending ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>

      {/* Decorative Background Glows */}
      <div className="fixed top-0 right-0 -z-10 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none" style={{ background: ha('primary', 0.05) }} />
      <div className="fixed bottom-0 left-64 -z-10 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none" style={{ background: ha('tertiary', 0.05) }} />
    </div>
  )
}
