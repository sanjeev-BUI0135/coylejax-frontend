export const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@600;700&display=swap');

  .psai-modal * { box-sizing: border-box; font-family: 'DM Sans', sans-serif; }

  .psai-list-scroll::-webkit-scrollbar { width: 4px; }
  .psai-list-scroll::-webkit-scrollbar-track { background: transparent; }
  .psai-list-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }

  .psai-drop-list::-webkit-scrollbar { display: none; }

  .psai-row {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 14px; border-radius: 10px;
    cursor: pointer; user-select: none;
    border: 1.5px solid transparent;
    background: #f8fafc;
    transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
  }
  .psai-row:hover { background: #f1f5f9; border-color: #e2e8f0; }
  .psai-row.active {
    background: linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%);
    border-color: #a5b4fc;
    box-shadow: 0 2px 12px rgba(99,102,241,0.12);
  }

  /* Checkbox style */
  .psai-checkbox {
    width: 18px; height: 18px; border-radius: 4px;
    border: 2px solid #cbd5e1; background: #fff;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: all 0.2s;
  }
  .psai-row.active .psai-checkbox { 
    border-color: #6366f1; background: #6366f1; 
  }

  .psai-checkmark {
    color: #fff; width: 12px; height: 12px;
    opacity: 0; transform: scale(0.5); transition: all 0.2s cubic-bezier(.34,1.56,.64,1);
  }
  .psai-row.active .psai-checkmark { 
    opacity: 1; transform: scale(1); 
  }

  .psai-trigger {
    width: 100%; display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px; border: 1.5px solid #e2e8f0; border-radius: 10px;
    background: #fff; font-size: 14px; cursor: pointer; outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .psai-trigger:hover { border-color: #a5b4fc; }
  .psai-trigger.open { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
  .psai-trigger:disabled { background: #f1f5f9; cursor: not-allowed; border-color: #e2e8f0; opacity: 0.7; }

  .psai-opt {
    width: 100%; display: block; padding: 10px 16px;
    font-size: 13.5px; text-align: left; color: #334155;
    background: transparent; border: none;
    border-bottom: 1px solid #f1f5f9; cursor: pointer;
    transition: background 0.1s, color 0.1s;
  }
  .psai-opt:hover { background: #f8fafc; }
  .psai-opt.active { background: #eef2ff; color: #4f46e5; font-weight: 500; }
  .psai-opt:last-child { border-bottom: none; }

  .psai-scroll-btn {
    width: 100%; padding: 5px 0; background: #fafafa; border: none;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    color: #94a3b8; transition: background 0.15s, color 0.15s;
  }
  .psai-scroll-btn:hover { background: #f1f5f9; color: #6366f1; }

  @keyframes psai-fadein {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .psai-dropdown { animation: psai-fadein 0.15s ease; }

  @keyframes psai-slidein {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .psai-item-enter { animation: psai-slidein 0.2s ease both; }
`;
