(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-LEARNER u101)
(define-constant ERR-INVALID-SKILL-HASH u102)
(define-constant ERR-INVALID-METADATA-URI u103)
(define-constant ERR-INVALID-COURSE-ID u104)
(define-constant ERR-BADGE-ALREADY-ISSUED u105)
(define-constant ERR-INVALID-ISSUER u106)
(define-constant ERR-INVALID-TIMESTAMP u107)
(define-constant ERR-AUTHORITY-NOT-VERIFIED u108)
(define-constant ERR-INVALID-EXPIRY u109)
(define-constant ERR-INVALID-LEVEL u110)
(define-constant ERR-INVALID-RARITY u111)
(define-constant ERR-MAX-BADGES-EXCEEDED u112)
(define-constant ERR-INVALID-UPDATE-PARAM u113)
(define-constant ERR-BADGE-NOT-FOUND u114)
(define-constant ERR-INVALID-STATUS u115)
(define-constant ERR-INVALID-CATEGORY u116)
(define-constant ERR-INVALID-DIFFICULTY u117)
(define-constant ERR-INVALID-PREREQ u118)
(define-constant ERR-INVALID-VERSION u119)
(define-constant ERR-INVALID-SCORE u120)

(define-data-var next-badge-id uint u0)
(define-data-var max-badges uint u100000)
(define-data-var issuance-fee uint u500)
(define-data-var authority-contract (optional principal) none)
(define-data-var contract-owner principal tx-sender)

(define-non-fungible-token skill-badge uint)

(define-map badges
  uint
  {
    learner: principal,
    skill-hash: (buff 32),
    metadata-uri: (string-ascii 256),
    course-id: uint,
    timestamp: uint,
    issuer: principal,
    expiry: uint,
    level: uint,
    rarity: (string-ascii 20),
    status: bool,
    category: (string-ascii 50),
    difficulty: uint,
    prereq-badge-id: (optional uint),
    version: uint,
    score: uint
  }
)

(define-map badges-by-skill-hash
  (buff 32)
  uint)

(define-map badge-updates
  uint
  {
    update-metadata-uri: (string-ascii 256),
    update-expiry: uint,
    update-timestamp: uint,
    updater: principal
  }
)

(define-read-only (get-badge (id uint))
  (map-get? badges id)
)

(define-read-only (get-badge-updates (id uint))
  (map-get? badge-updates id)
)

(define-read-only (is-badge-issued (skill-hash (buff 32)))
  (is-some (map-get? badges-by-skill-hash skill-hash))
)

(define-read-only (get-owner (id uint))
  (nft-get-owner? skill-badge id)
)

(define-private (validate-learner (learner principal))
  (if (not (is-eq learner 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-INVALID-LEARNER))
)

(define-private (validate-skill-hash (hash (buff 32)))
  (if (is-eq (len hash) u32)
      (ok true)
      (err ERR-INVALID-SKILL-HASH))
)

(define-private (validate-metadata-uri (uri (string-ascii 256)))
  (if (and (> (len uri) u0) (<= (len uri) u256))
      (ok true)
      (err ERR-INVALID-METADATA-URI))
)

(define-private (validate-course-id (cid uint))
  (if (> cid u0)
      (ok true)
      (err ERR-INVALID-COURSE-ID))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-issuer (issuer principal))
  (if (not (is-eq issuer 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-INVALID-ISSUER))
)

(define-private (validate-expiry (exp uint))
  (if (> exp block-height)
      (ok true)
      (err ERR-INVALID-EXPIRY))
)

(define-private (validate-level (lvl uint))
  (if (and (> lvl u0) (<= lvl u10))
      (ok true)
      (err ERR-INVALID-LEVEL))
)

(define-private (validate-rarity (rar (string-ascii 20)))
  (if (or (is-eq rar "common") (is-eq rar "rare") (is-eq rar "epic"))
      (ok true)
      (err ERR-INVALID-RARITY))
)

(define-private (validate-category (cat (string-ascii 50)))
  (if (and (> (len cat) u0) (<= (len cat) u50))
      (ok true)
      (err ERR-INVALID-CATEGORY))
)

(define-private (validate-difficulty (diff uint))
  (if (and (>= diff u1) (<= diff u5))
      (ok true)
      (err ERR-INVALID-DIFFICULTY))
)

(define-private (validate-prereq (prereq (optional uint)))
  (match prereq pid
    (if (is-some (map-get? badges pid))
        (ok true)
        (err ERR-INVALID-PREREQ))
    (ok true))
)

(define-private (validate-version (ver uint))
  (if (> ver u0)
      (ok true)
      (err ERR-INVALID-VERSION))
)

(define-private (validate-score (scr uint))
  (if (and (>= scr u0) (<= scr u100))
      (ok true)
      (err ERR-INVALID-SCORE))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-badges (new-max uint))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err ERR-NOT-AUTHORIZED))
    (asserts! (> new-max u0) (err ERR-INVALID-UPDATE-PARAM))
    (var-set max-badges new-max)
    (ok true)
  )
)

(define-public (set-issuance-fee (new-fee uint))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err ERR-NOT-AUTHORIZED))
    (asserts! (>= new-fee u0) (err ERR-INVALID-UPDATE-PARAM))
    (var-set issuance-fee new-fee)
    (ok true)
  )
)

(define-public (issue-badge
  (learner principal)
  (skill-hash (buff 32))
  (metadata-uri (string-ascii 256))
  (course-id uint)
  (expiry uint)
  (level uint)
  (rarity (string-ascii 20))
  (category (string-ascii 50))
  (difficulty uint)
  (prereq-badge-id (optional uint))
  (version uint)
  (score uint)
)
  (let (
        (next-id (var-get next-badge-id))
        (current-max (var-get max-badges))
        (authority (var-get authority-contract))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-BADGES-EXCEEDED))
    (try! (validate-learner learner))
    (try! (validate-skill-hash skill-hash))
    (try! (validate-metadata-uri metadata-uri))
    (try! (validate-course-id course-id))
    (try! (validate-expiry expiry))
    (try! (validate-level level))
    (try! (validate-rarity rarity))
    (try! (validate-category category))
    (try! (validate-difficulty difficulty))
    (try! (validate-prereq prereq-badge-id))
    (try! (validate-version version))
    (try! (validate-score score))
    (asserts! (is-none (map-get? badges-by-skill-hash skill-hash)) (err ERR-BADGE-ALREADY-ISSUED))
    (match authority auth
      (try! (stx-transfer? (var-get issuance-fee) tx-sender auth))
      (err ERR-AUTHORITY-NOT-VERIFIED)
    )
    (try! (nft-mint? skill-badge next-id learner))
    (map-set badges next-id
      {
        learner: learner,
        skill-hash: skill-hash,
        metadata-uri: metadata-uri,
        course-id: course-id,
        timestamp: block-height,
        issuer: tx-sender,
        expiry: expiry,
        level: level,
        rarity: rarity,
        status: true,
        category: category,
        difficulty: difficulty,
        prereq-badge-id: prereq-badge-id,
        version: version,
        score: score
      }
    )
    (map-set badges-by-skill-hash skill-hash next-id)
    (var-set next-badge-id (+ next-id u1))
    (print { event: "badge-issued", id: next-id })
    (ok next-id)
  )
)

(define-public (update-badge
  (badge-id uint)
  (update-metadata-uri (string-ascii 256))
  (update-expiry uint)
)
  (let ((badge (map-get? badges badge-id)))
    (match badge
      b
        (begin
          (asserts! (is-eq (get issuer b) tx-sender) (err ERR-NOT-AUTHORIZED))
          (try! (validate-metadata-uri update-metadata-uri))
          (try! (validate-expiry update-expiry))
          (map-set badges badge-id
            (merge b {
              metadata-uri: update-metadata-uri,
              expiry: update-expiry,
              timestamp: block-height
            })
          )
          (map-set badge-updates badge-id
            {
              update-metadata-uri: update-metadata-uri,
              update-expiry: update-expiry,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "badge-updated", id: badge-id })
          (ok true)
        )
      (err ERR-BADGE-NOT-FOUND)
    )
  )
)

(define-public (transfer-badge (id uint) (recipient principal))
  (let ((owner (unwrap! (nft-get-owner? skill-badge id) (err ERR-BADGE-NOT-FOUND))))
    (asserts! (is-eq tx-sender owner) (err ERR-NOT-AUTHORIZED))
    (nft-transfer? skill-badge id tx-sender recipient)
  )
)

(define-public (burn-badge (id uint))
  (let ((owner (unwrap! (nft-get-owner? skill-badge id) (err ERR-BADGE-NOT-FOUND))))
    (asserts! (is-eq tx-sender owner) (err ERR-NOT-AUTHORIZED))
    (nft-burn? skill-badge id tx-sender)
  )
)

(define-public (get-badge-count)
  (ok (var-get next-badge-id))
)

(define-public (check-badge-existence (skill-hash (buff 32)))
  (ok (is-badge-issued skill-hash))
)