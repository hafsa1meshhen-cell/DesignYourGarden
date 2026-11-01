import { Link } from 'react-router-dom'
import { Shovel } from 'lucide-react'
import { EmptyState, Page } from '../components/ui'

export default function NotFound() {
  return (
    <Page className="pt-10">
      <EmptyState
        icon={Shovel}
        title="This path leads to the compost heap"
        message="We couldn’t find that page. Let’s head back to your gardens."
        action={<Link to="/gardens" className="btn-primary">Back to My Gardens</Link>}
      />
    </Page>
  )
}
