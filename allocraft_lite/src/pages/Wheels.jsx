import React, { useState, useEffect } from 'react';
import { fetchFromAPI } from '@/api/fastapiClient';
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import WheelForm from "@/components/forms/WheelForm";
import { Plus, Edit, RotateCcw, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, calculateWheelTotal } from "@/lib/utils"; // <-- Add this import
import ImportExportButtons from "@/components/ImportExportButtons";

export default function Wheels() {
  const [wheels, setWheels] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingWheel, setEditingWheel] = useState(null);
  const [assignmentModal, setAssignmentModal] = useState(false);
  const [assignmentFormData, setAssignmentFormData] = useState({
    wheel_id: '',
    ticker: '',
    trade_type: 'Assignment',
    trade_date: new Date().toISOString().split('T')[0],
    strike_price: '',
    premium_received: '',
    status: 'Assigned',
    assigned_put_id: null
  });
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    wheel_id: '',
    ticker: '',
    trade_type: 'Sell Put',
    trade_date: new Date().toISOString().split('T')[0],
    strike_price: '',
    premium_received: '',
    status: 'Active'
  });

  useEffect(() => {
    loadWheels();
  }, []);

  const loadWheels = async () => {
    try {
      // Updated to use fetchFromAPI
      const data = await fetchFromAPI('/wheels/?ordering=-created_date');
      setWheels(data);
    } catch (error) {
      console.error('Error loading wheels:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      wheel_id: '',
      ticker: '',
      trade_type: 'Sell Put',
      trade_date: new Date().toISOString().split('T')[0],
      strike_price: '',
      premium_received: '',
      status: 'Active'
    });
    setEditingWheel(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const wheelData = {
        ...formData,
        strike_price: formData.strike_price ? parseFloat(formData.strike_price) : null,
        premium_received: formData.premium_received ? parseFloat(formData.premium_received) : null
      };

      if (editingWheel) {
        // Update
        await fetchFromAPI(`/wheels/${editingWheel.id}/`, {
          method: 'PUT',
          body: JSON.stringify(wheelData)
        });
      } else {
        // Create
        await fetchFromAPI('/wheels/', {
          method: 'POST',
          body: JSON.stringify(wheelData)
        });
      }

      loadWheels();
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('Error saving wheel:', error);
    }
  };

  const handleEdit = (wheel) => {
    setEditingWheel(wheel);
    setFormData({
      wheel_id: wheel.wheel_id ?? '',
      ticker: wheel.ticker ?? '',
      trade_type: wheel.trade_type ?? 'Sell Put',
      trade_date: wheel.trade_date ?? new Date().toISOString().split('T')[0],
      strike_price: wheel.strike_price !== undefined && wheel.strike_price !== null ? wheel.strike_price.toString() : '',
      premium_received: wheel.premium_received !== undefined && wheel.premium_received !== null ? wheel.premium_received.toString() : '',
      status: wheel.status ?? 'Active'
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this wheel trade?')) {
      try {
        await fetchFromAPI(`/wheels/${id}/`, { method: 'DELETE' });
        loadWheels();
      } catch (error) {
        console.error('Error deleting wheel:', error);
      }
    }
  };

  // Group wheels by wheel_id (Wheel Group ID)
  const groupedWheels = wheels.reduce((acc, wheel) => {
    acc[wheel.wheel_id] = acc[wheel.wheel_id] || [];
    acc[wheel.wheel_id].push(wheel);
    return acc;
  }, {});

  // Handler for the Plus icon in each group row
  const handleAddTradeToGroup = (wheelGroupId, ticker) => {
    setFormData({
      ...formData,
      wheel_id: wheelGroupId,
      ticker: ticker // Pre-fill ticker as well
    });
    setShowForm(true);
    setEditingWheel(null);
  };

  // Handler for Assignment action
  const handleAssignment = (put) => {
    setAssignmentFormData({
      wheel_id: put.wheel_id,
      ticker: put.ticker,
      trade_type: "Assignment",
      trade_date: new Date().toISOString().split('T')[0],
      strike_price: put.strike_price,
      premium_received: put.premium_received,
      status: "Assigned",
      assigned_put_id: put.id // tie assignment to the put
    });
    setAssignmentModal(true);
  };

  // Example Assignment Modal (replace with your modal/form)
  const AssignmentModal = ({ isOpen, onClose, formData, setFormData, onSubmit }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
          <h2 className="text-xl font-bold mb-4">Assignment</h2>
          <div className="space-y-2">
            <div>
              <label className="block text-sm font-medium">Wheel Group ID</label>
              <input className="w-full border rounded px-2 py-1" value={formData.wheel_id} disabled />
            </div>
            <div>
              <label className="block text-sm font-medium">Ticker</label>
              <input className="w-full border rounded px-2 py-1" value={formData.ticker} disabled />
            </div>
            <div>
              <label className="block text-sm font-medium">Trade Type</label>
              <input className="w-full border rounded px-2 py-1" value={formData.trade_type} disabled />
            </div>
            <div>
              <label className="block text-sm font-medium">Strike Price</label>
              <input className="w-full border rounded px-2 py-1" value={formData.strike_price} disabled />
            </div>
            {/* Add more fields as needed */}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={() => {
                onSubmit(formData);
                onClose();
              }}
              className="bg-slate-900 text-white"
            >
              Confirm Assignment
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Submit handler for assignment
  const handleAssignmentSubmit = async (assignmentData) => {
    // Implement your API call here
    // Example:
    // await fetch('/wheels/assignment', { method: 'POST', body: JSON.stringify(assignmentData) });
    // Reload wheels after assignment
    await loadWheels();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-64"></div>
            <div className="h-96 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Wheel Strategies</h1>
            <p className="text-slate-600 mt-2">
              Cash-secured puts and covered calls
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <ImportExportButtons section="wheels" />
            <Button
              onClick={() => {
                setShowForm(true);
                setEditingWheel(null);
                setFormData({
                  wheel_id: '',
                  ticker: '',
                  trade_type: 'Sell Put',
                  trade_date: new Date().toISOString().split('T')[0],
                  strike_price: '',
                  premium_received: '',
                  status: 'Active'
                });
              }}
              className="bg-slate-900 hover:bg-slate-800 shadow-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Trade
            </Button>
          </div>
        </div>

        {/* Wheel Groups Table */}
        <div className="mt-8">
          {Object.entries(groupedWheels).map(([groupId, groupWheels]) => {
            // Define these inside the map!
            const sellPut = groupWheels.find(w => w.trade_type === "Sell Put");
            const assignment = groupWheels.find(w => w.trade_type === "Assignment");
            const sellCall = groupWheels.find(w => w.trade_type === "Sell Call");
            const calledAway = groupWheels.find(w => w.trade_type === "Called Away");

            return (
              <div key={groupId} className="mb-8 border rounded-lg shadow bg-white">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                  <div className="text-lg font-semibold">{groupId}</div>
                  <Button
                    variant="outline"
                    size="icon"
                    title="Add Trade to this Wheel Group"
                    onClick={() => handleAddTradeToGroup(groupId, groupWheels[0]?.ticker || "")}
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Trade Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Strike Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Premium</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupWheels.map((wheel) => (
                      <tr key={wheel.id}>
                        <td className="px-6 py-4 whitespace-nowrap">{wheel.trade_type}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{wheel.strike_price}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{wheel.premium_received}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{wheel.status}</td>
                        <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                          {/* Assignment Action Button for open puts */}
                          {wheel.trade_type === "Sell Put" && wheel.status === "Open" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAssignment(wheel)}
                              title="Mark as Assigned"
                            >
                              Assignment
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(wheel)}
                            className="hover:bg-slate-100"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(wheel.id)}
                            className="hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Wheel Phase Row - New Component Integrated Here */}
                <div className="flex items-center gap-0 py-6">
                  {/* Sell Put */}
                  <div className="flex flex-col items-center px-4">
                    <div className="bg-slate-100 rounded-l-full rounded-r-none px-6 py-2 font-bold border border-slate-300">
                      Sell ${groupWheels[0]?.strike_price} Put
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      {groupWheels[0]?.premium_received !== undefined ? `$${groupWheels[0]?.premium_received} premium` : "-"}
                    </div>
                  </div>
                  {/* Assigned */}
                  <div className="flex flex-col items-center px-4">
                    <div className="bg-slate-100 px-6 py-2 font-bold border border-slate-300">
                      Assigned at ${groupWheels[0]?.strike_price}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      {assignment ? `${(assignment.contracts || 1) * 100} shares` : "-"}
                    </div>
                  </div>
                  {/* Sell Call */}
                  <div className="flex flex-col items-center px-4">
                    <div className="bg-slate-100 px-6 py-2 font-bold border border-slate-300">
                      {sellCall
                        ? `Sell $${sellCall.strike_price} Call`
                        : "Sell Call"}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      {sellCall?.premium_received
                        ? `$${sellCall.premium_received} premium`
                        : "-"}
                    </div>
                  </div>
                  {/* Called Away */}
                  <div className="flex flex-col items-center px-4">
                    <div className="bg-slate-100 rounded-r-full rounded-l-none px-6 py-2 font-bold border border-slate-300">
                      Called Away at ${calledAway?.strike_price}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      {assignment && calledAway ? `$${((calledAway.strike_price - assignment.strike_price) * ((assignment.contracts || 1) * 100)).toFixed(2)} profit` : "-"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add/Edit Trade Modal */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900">
                {editingWheel ? "Edit Wheel Trade" : "Add Wheel Trade"}
              </DialogTitle>
            </DialogHeader>
            <WheelForm
              formData={formData}
              editingWheel={editingWheel}
              onChange={(field, value) =>
                setFormData((prev) => ({ ...prev, [field]: value }))
              }
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Assignment Modal */}
        <AssignmentModal
          isOpen={assignmentModal}
          onClose={() => setAssignmentModal(false)}
          formData={assignmentFormData}
          setFormData={setAssignmentFormData}
          onSubmit={handleAssignmentSubmit}
        />
      </div>
    </div>
  );
}