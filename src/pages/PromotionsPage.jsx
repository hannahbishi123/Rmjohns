import { useApp } from '../context/AppContext'
import { Pagination, usePagination } from '../components/shared'

export default function PromotionsPage() {
  const { promotions, setPromotions, setDialog, notify } = useApp()
  const { currentPage, totalPages, paginatedItems, setCurrentPage } = usePagination(promotions, 5)
  function toggle(promotion) {
    const status = promotion.status === 'Active' ? 'Paused' : 'Active'
    setPromotions((current) => current.map((item) => item.id === promotion.id ? { ...item, status } : item))
    notify(`${promotion.name} ${status.toLowerCase()}`)
  }
  return <section className="panel full-panel"><div className="panel-heading"><div><h2>Promotions</h2><p>Manage loyalty offers shown in the demo experience.</p></div><button className="button button-dark" onClick={() => setDialog({ type: 'add-promotion' })}>＋ <span>Add promotion</span></button></div><div className="table-scroll"><table className="data-table"><thead><tr><th>PROMOTION</th><th>OFFER</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{paginatedItems.map((promotion) => <tr key={promotion.id}><td><strong>{promotion.name}</strong></td><td>{promotion.detail}</td><td><span className={`status-badge ${promotion.status.toLowerCase()}`}><i />{promotion.status}</span></td><td><div className="row-actions"><button aria-label={`Edit ${promotion.name}`} onClick={() => setDialog({ type: 'edit-promotion', promotion })}>✎</button><button aria-label={`Toggle ${promotion.name}`} onClick={() => toggle(promotion)}>{promotion.status === 'Active' ? 'Ⅱ' : '▶'}</button><button aria-label={`Delete ${promotion.name}`} onClick={() => setPromotions((current) => current.filter((item) => item.id !== promotion.id))}>⌫</button></div></td></tr>)}</tbody></table></div><Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => setCurrentPage(page)} /></section>
}
