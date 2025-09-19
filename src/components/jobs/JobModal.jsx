import React, { useState, useEffect } from 'react'
import Modal from '../common/Modal.jsx'


export default function JobModal({open, onClose, onSave, initial}){
const [title,setTitle]=useState('')
const [slug,setSlug]=useState('')
const [tags,setTags]=useState('')
useEffect(()=>{
setTitle(initial?.title||''); setSlug(initial?.slug||''); setTags((initial?.tags||[]).join(','))
},[initial,open])


function submit(e){
e.preventDefault()
if(!title.trim()) return alert('Title required')
const data={ title: title.trim(), slug: slug.trim()||title.toLowerCase().replaceAll(' ','-'), tags: tags.split(',').map(s=>s.trim()).filter(Boolean) }
onSave(data)
}
return (
<Modal open={open} onClose={onClose} title={initial? 'Edit job':'Create job'}>
<form onSubmit={submit} className="space-y-3">
<label className="block text-sm">Title
<input value={title} onChange={e=>setTitle(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" />
</label>
<label className="block text-sm">Slug
<input value={slug} onChange={e=>setSlug(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" />
</label>
<label className="block text-sm">Tags (comma separated)
<input value={tags} onChange={e=>setTags(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" />
</label>
<div className="pt-2 flex justify-end gap-2">
<button type="button" onClick={onClose} className="px-3 py-1 rounded bg-slate-100">Cancel</button>
<button className="px-3 py-1 rounded bg-slate-900 text-white">Save</button>
</div>
</form>
</Modal>
)
}