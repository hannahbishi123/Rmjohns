import { useApp } from '../context/AppContext'
import { FoodCard, FoodThumb } from '../components/shared'
import { money } from '../data/mockData'

export default function MenuPage() {
  const {
    role, filteredMenu, categories, category, setCategory,
    query, setQuery, addToCart, updateMenuItem, setDialog, cartCount,
  } = useApp()
  const isAdmin = role === 'Admin'

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="menu-toolbar">
        <div className="search-box">
          <span>⌕</span>
          <input
            value={query}
            maxLength="120"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the menu..."
          />
        </div>
        <div className="category-pills">
          {categories.map((item) => (
            <button
              key={item}
              className={category === item ? 'category-pill selected' : 'category-pill'}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
        {!isAdmin && (
          <button
            className="button button-outline cart-quick"
            onClick={() => setDialog({ type: 'info', title: 'Your cart', text: `${cartCount} items are in your cart. Select Cart in the sidebar to review them.` })}
          >
            ＋ {cartCount}
          </button>
        )}
      </div>

      {/* ── Admin table view ── */}
      {isAdmin ? (
        <section className="panel full-panel">
          <div className="table-scroll">
            <table className="data-table menu-table">
              <thead>
                <tr>
                  <th>ITEM</th>
                  <th>CATEGORY</th>
                  <th>PRICE</th>
                  <th>PHOTO</th>
                  <th>AVAILABILITY</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredMenu.map((item) => (
                  <tr key={item.id}>
                    {/* Name + description */}
                    <td>
                      <div className="table-product">
                        <FoodThumb item={item} small />
                        <span>
                          <strong>{item.name}</strong>
                          <small>{item.description}</small>
                        </span>
                      </div>
                    </td>

                    <td>{item.category}</td>

                    <td><strong>{money(item.price)}</strong></td>

                    {/* Photo indicator — shows thumbnail or "No photo" */}
                    <td>
                      {item.image ? (
                        <div className="menu-photo-cell">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="menu-photo-thumb"
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                          />
                          <span className="menu-photo-badge has-photo">Photo</span>
                        </div>
                      ) : (
                        <span className="menu-photo-badge no-photo">No photo</span>
                      )}
                    </td>

                    {/* Availability toggle */}
                    <td>
                      <button
                        className={`availability ${item.available ? 'is-available' : ''}`}
                        onClick={() => updateMenuItem(item.id, { available: !item.available })}
                      >
                        <i />{item.available ? 'Available' : 'Unavailable'}
                      </button>
                    </td>

                    {/* Edit / Delete */}
                    <td>
                      <div className="row-actions">
                        <button
                          aria-label={`Edit ${item.name}`}
                          onClick={() => setDialog({ type: 'edit-menu', item })}
                        >
                          ✎
                        </button>
                        <button
                          aria-label={`Delete ${item.name}`}
                          onClick={() => setDialog({ type: 'delete-menu', item })}
                        >
                          ⌫
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredMenu.length === 0 && (
              <div className="empty-state">No menu items found.</div>
            )}
          </div>
        </section>
      ) : (
        /* ── Customer / Staff card grid ── */
        <div className="food-grid">
          {filteredMenu.filter((item) => item.available).map((item) => (
            <FoodCard
              key={item.id}
              item={item}
              onAdd={() => addToCart(item)}
              onDetails={() => setDialog({ type: 'food', item })}
            />
          ))}
        </div>
      )}
    </>
  )
}
