// USAGE EXAMPLE: Register Upload Modal Integration
// Location: components/Vertex.tsx (already integrated)

// 1. Import the modal component
import { RegisterUploadModal } from '@/components/RegisterUploadModal';

// 2. Add state for modal visibility
const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

// 3. Add button to trigger modal (in header area)
<Button
  onClick={() => setIsUploadModalOpen(true)}
  className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
>
  <Upload className="w-3.5 h-3.5 mr-2" />
  Upload Register
</Button>

// 4. Render modal component
<RegisterUploadModal
  isOpen={isUploadModalOpen}
  onClose={() => setIsUploadModalOpen(false)}
  onSuccess={() => {
    // Refresh patient data after successful upload
    mutate((key) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'));
  }}
/>

// FILE HANDLING:
// - Images (.jpg, .png) → /api/register-extract (OCR with Tesseract/Gemini)
// - Excel (.xlsx, .csv) → /api/register-reconcile (Direct insertion)
// - Age field automatically cast to Number for schema compliance
