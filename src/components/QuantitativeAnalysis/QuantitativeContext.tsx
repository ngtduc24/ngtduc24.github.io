import React, { createContext, useContext, useState, ReactNode } from 'react';

export type MeasureType = 'Scale' | 'Ordinal' | 'Nominal';

export interface Variable {
  id: string;
  name: string; // e.g., 'gender', 'age', 'q1'
  label: string; // e.g., 'Giới tính', 'Tuổi', 'Câu hỏi 1'
  type: 'Numeric' | 'String';
  measure: MeasureType;
  values: Record<string, string>; // e.g., { '1': 'Nam', '2': 'Nữ' }
  missing: string[]; // e.g., ['-99']
}

export interface DataRow {
  id: string;
  [variableName: string]: string | number;
}

interface QuantitativeContextType {
  variables: Variable[];
  setVariables: React.Dispatch<React.SetStateAction<Variable[]>>;
  data: DataRow[];
  setData: React.Dispatch<React.SetStateAction<DataRow[]>>;
  dataView: 'data-view' | 'variable-view';
  setDataView: React.Dispatch<React.SetStateAction<'data-view' | 'variable-view'>>;
  results: any[];
  setResults: React.Dispatch<React.SetStateAction<any[]>>;
  addVariable: () => void;
  updateVariable: (id: string, updates: Partial<Variable>) => void;
  removeVariable: (id: string) => void;
  addDataRow: () => void;
  updateData: (rowId: string, varName: string, value: string | number) => void;
}

const QuantitativeContext = createContext<QuantitativeContextType | undefined>(undefined);

export function QuantitativeProvider({ children }: { children: ReactNode }) {
  const [variables, setVariables] = useState<Variable[]>([
    {
      id: '1',
      name: 'VAR00001',
      label: '',
      type: 'Numeric',
      measure: 'Scale',
      values: {},
      missing: []
    }
  ]);
  const [dataView, setDataView] = useState<'data-view' | 'variable-view'>('variable-view');
  const [data, setData] = useState<DataRow[]>([]);
  const [results, setResults] = useState<any[]>([]);

  const addVariable = () => {
    const newId = Date.now().toString();
    const newName = `VAR${String(variables.length + 1).padStart(5, '0')}`;
    setVariables([...variables, {
      id: newId,
      name: newName,
      label: '',
      type: 'Numeric',
      measure: 'Scale',
      values: {},
      missing: []
    }]);
  };

  const updateVariable = (id: string, updates: Partial<Variable>) => {
    setVariables(variables.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  const removeVariable = (id: string) => {
    setVariables(variables.filter(v => v.id !== id));
  };

  const addDataRow = () => {
    const newRow: DataRow = { id: Date.now().toString() };
    variables.forEach(v => {
      newRow[v.name] = '';
    });
    setData([...data, newRow]);
  };

  const updateData = (rowId: string, varName: string, value: string | number) => {
    setData(data.map(row => row.id === rowId ? { ...row, [varName]: value } : row));
  };

  return (
    <QuantitativeContext.Provider value={{
      variables, setVariables,
      data, setData,
      dataView, setDataView,
      results, setResults,
      addVariable, updateVariable, removeVariable,
      addDataRow, updateData
    }}>
      {children}
    </QuantitativeContext.Provider>
  );
}

export function useQuantitative() {
  const context = useContext(QuantitativeContext);
  if (context === undefined) {
    throw new Error('useQuantitative must be used within a QuantitativeProvider');
  }
  return context;
}
