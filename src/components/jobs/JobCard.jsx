export default function JobCard({job, onArchiveToggle}){
return (
<div className="rounded-xl border bg-white p-4 shadow-sm">
<div className="flex items-center justify-between">
<div>
<div className="font-semibold">{job.title}</div>
<div className="text-xs text-slate-500">/{job.slug}</div>
<div className="mt-2 flex flex-wrap gap-2">
{job.tags?.map(t=> <span key={t} className="text-xs px-2 py-0.5 bg-slate-100 rounded-full">{t}</span>)}
</div>
</div>
<button onClick={onArchiveToggle} className="px-3 py-1 rounded bg-slate-900 text-white text-sm">
{job.status==='active'? 'Archive' : 'Unarchive'}
</button>
</div>
</div>
)
}