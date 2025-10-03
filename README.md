# 🎓 SkillBadge NFT Platform

Welcome to the ultimate decentralized solution for skill verification! This project enables online course platforms to issue NFT-based skill badges that learners can own, transfer, and verify across ecosystems, solving the real-world problem of fragmented credentials and lack of portability in education.

## ✨ Features

🛡️ Issue verifiable NFT badges upon course completion  
🔄 Transfer badges seamlessly between platforms or wallets  
✅ Cross-platform verification of skills and achievements  
📜 Immutable records of course details and issuer reputation  
🚀 Integrate with multiple course providers via standardized contracts  
🔒 Prevent fraud with on-chain enrollment and completion proofs  
💼 Portable credentials for job applications and resumes  

## 🛠 How It Works

This Clarity-based project on Stacks involves 8 smart contracts for modularity and security:

1. **BadgeIssuer.clar**: Core contract for minting NFT badges (using SIP-010 standard). Platforms call `issue-badge` with learner address, skill hash, and metadata URI.
2. **CourseRegistry.clar**: Registers approved course providers and courses. Admins add courses with details like title, duration, and required proofs.
3. **EnrollmentManager.clar**: Handles student enrollments. Learners call `enroll` in a course, paying any fees; tracks progress via oracles or self-reported completions.
4. **CompletionVerifier.clar**: Verifies course completion through signatures or on-chain proofs. Triggers badge issuance upon success.
5. **BadgeTransfer.clar**: Manages transfers with hooks for cross-platform compatibility, including royalty splits to original issuers.
6. **VerificationOracle.clar**: Provides off-chain fed data for skill validation; anyone can query badge authenticity and history.
7. **ReputationSystem.clar**: Tracks issuer and learner reputations based on badge transfers, revocations, and feedback to build trust.
8. **FeeDistributor.clar**: Handles platform fees, royalties, and distributions for sustainability.

**For Course Platforms**

- Register your platform via CourseRegistry.
- Enroll learners and verify completions to issue badges via BadgeIssuer.
- Earn royalties on transfers!

**For Learners**

- Enroll in courses and complete them to mint your NFT badge.
- Transfer badges to other wallets or platforms using BadgeTransfer.
- Verify your skills anytime with VerificationOracle.

**For Employers/Verifiers**

- Query badge details and ownership on-chain.
- Trust portable, tamper-proof credentials.

Deploy on Stacks testnet, integrate with frontends, and revolutionize education credentials!