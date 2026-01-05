import { Check } from 'lucide-react'

interface PricingCardProps {
  title: string
  price: string
  description?: string
  features: string[]
  popular?: boolean
  onClick: () => void
}

export default function PricingCard({
  title,
  price,
  description,
  features,
  popular = false,
  onClick,
}: PricingCardProps) {
  const handleClick = () => {
    console.log('[PricingCard] Choose Plan clicked for:', title)
    onClick()
  }

  const cardStyle = popular ? {
    backgroundColor: '#1a1a1a',
    border: '2px solid #ffd700',
    boxShadow: '0 20px 25px -5px rgba(255, 215, 0, 0.3)',
  } : {
    backgroundColor: '#1a1a1a',
    border: '2px solid #333',
  }

  return (
    <div
      onClick={handleClick}
      style={{
        ...cardStyle,
        borderRadius: '12px',
        padding: '24px',
        transition: 'all 0.2s',
        position: 'relative',
        zIndex: 30,
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)'
        e.currentTarget.style.boxShadow = '0 25px 30px -5px rgba(255, 215, 0, 0.2)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.boxShadow = popular
          ? '0 20px 25px -5px rgba(255, 215, 0, 0.3)'
          : 'none'
      }}
    >
      {popular && (
        <div style={{
          backgroundColor: '#ffd700',
          color: '#1a120b',
          fontSize: '12px',
          fontWeight: 'bold',
          padding: '6px 12px',
          borderRadius: '20px',
          display: 'inline-block',
          marginBottom: '16px',
          fontFamily: "'Playfair Display', Georgia, serif",
        }}>
          Most Popular
        </div>
      )}

      <h3 style={{
        fontSize: '20px',
        fontWeight: 'bold',
        marginBottom: '8px',
        color: '#ffd700',
        fontFamily: "'Playfair Display', Georgia, serif",
      }}>
        {title}
      </h3>

      {description && (
        <p style={{
          fontSize: '14px',
          marginBottom: '16px',
          color: popular ? '#a0a0a0' : '#a0a0a0',
          fontFamily: "'Merriweather', Georgia, serif",
        }}>
          {description}
        </p>
      )}

      <div style={{ marginBottom: '24px' }}>
        <span style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#f5f5f5',
          fontFamily: "'Playfair Display', Georgia, serif",
        }}>
          {price}
        </span>
        {price !== 'Free' && (
          <span style={{
            fontSize: '14px',
            marginLeft: '8px',
            color: '#a0a0a0',
            fontFamily: "'Merriweather', Georgia, serif",
          }}>
            one-time
          </span>
        )}
      </div>

      <ul style={{ marginBottom: '24px', listStyle: 'none', padding: 0 }}>
        {features.map((feature, i) => (
          <li key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            marginBottom: '12px',
            color: '#f5f5f5',
            fontFamily: "'Merriweather', Georgia, serif",
          }}>
            <Check style={{
              width: '20px',
              height: '20px',
              flexShrink: 0,
              color: '#ffd700',
            }} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={handleClick}
        style={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: '8px',
          fontWeight: '600',
          fontSize: '14px',
          backgroundColor: '#ffd700',
          color: '#1a120b',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s',
          fontFamily: "'Playfair Display', Georgia, serif",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#e6c200'
          e.currentTarget.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#ffd700'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
      >
        Choose Plan
      </button>
    </div>
  )
}
