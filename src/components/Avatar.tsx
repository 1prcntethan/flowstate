type Props = {
  username: string
  frameAssetUrl?: string | null  // null = no frame
  size?: number
}

export default function Avatar({ username, frameAssetUrl, size = 40 }: Props) {
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      {/* Base avatar — initials for now, photo later */}
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--pink)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        color: 'white',
        fontFamily: 'var(--body-text)',
      }}>
        {username[0]?.toUpperCase()}
      </div>

      {/* Decorative frame rendered on top */}
      {frameAssetUrl && (
        <img
          src={frameAssetUrl}
          style={{
            position: 'absolute',
            inset: -size * 0.1,   // frames typically extend slightly beyond the circle
            width: size * 1.2,
            height: size * 1.2,
            pointerEvents: 'none',
          }}
          alt=""
        />
      )}
    </div>
  )
}