import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'

const defaults = { courseCode: '', rating: 5, comment: '' }

export default function ReviewForm() {
  const nav = useNavigate()
  const { id } = useParams()
  const [form, setForm] = useState(defaults)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    api.get(`/reviews/${id}`) // GET the review being edited (token attached automatically)
      .then(res => setForm({ // on success, fill the form with the loaded review
        courseCode: res.data.courseCode, // pick only the three editable fields (not _id or reviewedBy)
        rating: res.data.rating, // already a number from the server
        comment: res.data.comment || '', // fall back to '' so the textarea stays controlled if there is no comment
      }))
      .catch(err => setError(err?.response?.data?.message || 'Could not load review')) // e.g. 404: show the server's message
  }, [id]) // re-run only when the id in the URL changes

  function onChange(e) {
    const { name, value } = e.target // which input fired (its name attribute) and its new value (always a string)
    setForm(prev => ({ // use the previous state so we never overwrite the other fields with stale data
      ...prev, // copy all existing fields (courseCode, rating, comment) into the new object
      [name]: name === 'rating' ? Number(value) : value, // overwrite only the changed field; convert rating "4" -> 4
    }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    const body = { // the request body, shared by POST and PATCH
      courseCode: form.courseCode, // course being reviewed, from state
      rating: form.rating, // already a number thanks to onChange
      comment: form.comment, // optional text; no reviewedBy on purpose, the server takes it from the token
    }
    try { // run the request; any failure jumps to the catch block below
      if (id) { // edit mode: the URL has an id
        await api.patch(`/reviews/${id}`, body) // PATCH the existing review; 403 if it belongs to someone else
      } else { // write mode
        await api.post('/reviews', body) // POST a new review; 400 invalid rating, 409 duplicate
      }
      nav('/reviews') // success: go back to the reviews list
    } catch (err) { // server returned an error
      setError(err?.response?.data?.message || 'Could not save review') // show the server's message, or a fallback if none
    }
  }

  async function onDelete() {
    if (!window.confirm('Delete this review?')) return // ask first; if the user cancels, do nothing
    setError('') // clear any previous error before trying
    try { // run the request; any failure jumps to the catch block below
      await api.delete(`/reviews/${id}`) // DELETE the review; 403 if not yours, 404 if it no longer exists
      nav('/reviews') // success: go back to the reviews list
    } catch (err) { // server returned an error
      setError(err?.response?.data?.message || 'Could not delete review') // show the server's message, or a fallback if none
    }
  }

  return (
    <div className="max-w-lg mx-auto card">
      <h1 className="text-xl font-semibold mb-4">{id ? 'Edit' : 'Write'} Review</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        {/* Text input for the course code; name="courseCode" lets onChange know which field to update */}
        <input
          className="input" // shared Tailwind style used by the other pages' inputs
          name="courseCode" // must match the key in `form` so onChange updates the right field
          placeholder="Course code (e.g. CS101)" // hint text shown while empty
          value={form.courseCode} // controlled input: displayed value comes from state
          onChange={onChange} // every keystroke updates form.courseCode
          required // browser blocks submit if empty (the server requires a course code)
        />
        {/* Dropdown for the rating; name="rating" makes onChange convert the value to a number */}
        <select
          className="input" // same styling as the text input
          name="rating" // must match the key in `form`; onChange checks this name to apply Number()
          value={form.rating} // controlled: the selected option comes from state
          onChange={onChange} // selecting an option updates form.rating
        >
          {[1, 2, 3, 4, 5].map(n => ( // generate one <option> per rating from 1 to 5
            <option key={n} value={n}>{n}</option> // key helps React track items; value is what e.target.value reads
          ))}
        </select>
        {/* Multi-line input for the optional comment (no `required`) */}
        <textarea
          className="input" // same styling as the other inputs
          name="comment" // must match the key in `form`
          placeholder="Comment (optional)" // hint text shown while empty
          rows={4} // visible height of the box
          value={form.comment} // controlled: displayed text comes from state
          onChange={onChange} // typing updates form.comment
        />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button className="btn" type="submit">Save</button>
        {id && ( // only render the Delete button in edit mode (hidden on /reviews/new)
          <button className="btn" type="button" onClick={onDelete}> {/* type="button" so clicking it does not submit the form */}
            Delete
          </button>
        )}
      </form>
    </div>
  )
}
