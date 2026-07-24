#!/usr/bin/env bash
set -e

BRANCH="feature/ai_service"

echo "🚀 Creating commits..."

# ============================================================================
# 1. AI Service
# ============================================================================

git add apps/ai_service

git commit -m "feat(ai): initialize AI microservice

- create AI microservice
- configure application bootstrap
- register core modules" || true

# ============================================================================
# 2. AI Gateway
# ============================================================================

git add apps/api-gateway/src/ai

git commit -m "feat(gateway): expose AI service endpoints

- add AI controller
- add AI gateway service
- connect gateway to AI microservice" || true

# ============================================================================
# 3. Document Service
# ============================================================================

git add \
apps/document_service/src/document_service.module.ts \
apps/document_service/src/document_service.controller.ts \
apps/document_service/src/document_service.controller.spec.ts \
apps/document_service/src/main.ts \
apps/document_service/src/dtos \
apps/document_service/src/models

git commit -m "feat(document): add document management module

- implement document module
- add document DTOs
- define document schemas
- configure application" || true

# ============================================================================
# 4. Document Processing
# ============================================================================

git add \
apps/document_service/src/services \
apps/document_service/src/rpc

git commit -m "feat(document): implement document processing

- add upload service
- implement text extraction
- add RPC handlers
- implement document business logic" || true

# ============================================================================
# 5. Gateway Document Integration
# ============================================================================

git add apps/api-gateway/src/document

git commit -m "feat(gateway): integrate document service

- expose document endpoints
- connect gateway to document service" || true

# ============================================================================
# 6. Everything Else (Lint)
# ============================================================================

git add .

git commit -m "style: apply project-wide lint fixes and code cleanup

- resolve ESLint issues
- remove unused imports
- standardize formatting
- improve code consistency
- update minor documentation" || true

echo "🚀 Pushing..."
git push origin "$BRANCH"

echo "✅ Done!"
