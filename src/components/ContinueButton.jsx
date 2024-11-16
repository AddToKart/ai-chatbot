export default function ContinueButton({ onContinue, isDark }) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        onContinue();
      }}
      className={`mt-4 px-4 py-2 rounded-lg ${
        isDark 
          ? 'bg-blue-600 hover:bg-blue-700' 
          : 'bg-blue-500 hover:bg-blue-600'
      } text-white transition-colors`}
    >
      Continue Generation
    </button>
  );
}
