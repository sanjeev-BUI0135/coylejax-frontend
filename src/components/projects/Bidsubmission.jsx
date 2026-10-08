import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Info, Plus } from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../../services/masterDataService';

export default function BidSubmissionDialog({ project, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    submitted_by_id: '',
    customer_request: '',
    bid_value: ''
  });
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
  const [divisions, setDivisions] = useState([]);
  const [currentDivision, setCurrentDivision] = useState(null);
  const [bidUsers, setBidUsers] = useState([]);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUserData, setNewUserData] = useState({
    full_name: '',
    email: '',
    password: '',
    project_type: project.project_type || ''
  });
  const isBidUser = user.role_type === "Bid User";
  // const canSelectBidder = user.role_type?.toLowerCase() !== "bid user";

  useEffect(() => {
    loadDivisions();

    if (!isBidUser) {
      // Non–Bid User → load all bid users
      loadBidUsers();
    } else {
      setFormData(prev => ({
        ...prev,
        submitted_by_id: user.id || user._id
      }));
    }
  }, [user]);

  useEffect(() => {
    if (divisions.length > 0 && project.project_type) {
      const matchingDivision = divisions.find(div =>
        div.status === 'active' && (
          div.value.toLowerCase() === project.project_type?.toLowerCase() ||
          div.display_name.toLowerCase().replace(/\s+/g, '_') === project.project_type?.toLowerCase()
        )
      );
      setCurrentDivision(matchingDivision);
    }
  }, [divisions, project.project_type]);

  const loadDivisions = async () => {
    try {
      const divisionsData = await api.getAll('divisions');
      const sorted = (divisionsData.data || divisionsData || [])
        .sort((a, b) => a.sort_order - b.sort_order);
      setDivisions(sorted);
    } catch (error) {
      console.error('Failed to load divisions:', error);
    }
  };

  const getAdminId = (user) => {
    if (user.role_type?.toLowerCase() === "admin") {
      return String(user.id || user._id);
    }
    return String(user.created_by);
  };
  // console.log("getAdminId user>>>", user);

  const loadBidUsers = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}/users`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const users = await response.json();
      const adminId = getAdminId(user);

      const filteredBidUsers = users.filter((u) => {
        return (
          u.role_type?.toLowerCase() === "bid user" &&
          String(u.created_by) === adminId
        );
      });

      setBidUsers(filteredBidUsers);
    } catch (error) {
      console.error("Failed to load bid users:", error);
    }
  };

  const showTermsAndConditions = (e) => {
    e.preventDefault();

    if (!currentDivision) {
      Swal.fire({
        title: 'Terms Not Available',
        html: `
          <div class="text-left">
            <p class="mb-2">No division found for project type: <strong>${project.project_type || 'Not Set'}</strong></p>
            <p class="text-sm text-gray-600temp">Please contact support for terms and conditions.</p>
          </div>
        `,
        icon: 'info',
        confirmButtonColor: '#3b82f6',
      });
      return;
    }

    if (!currentDivision.terms_and_conditions || currentDivision.terms_and_conditions.trim() === '') {
      Swal.fire({
        title: 'Terms Not Set',
        html: `
          <div class="text-left">
            <p class="mb-2">Division: <strong>${currentDivision.display_name}</strong></p>
            <p class="text-sm text-gray-600temp">Terms and conditions have not been configured for this division yet.</p>
          </div>
        `,
        icon: 'info',
        confirmButtonColor: '#3b82f6',
      });
      return;
    }

    Swal.fire({
      title: `Terms and Conditions - ${currentDivision.display_name}`,
      html: currentDivision.terms_and_conditions,
      showConfirmButton: false,
      showCloseButton: true,
      width: '90%',
      heightAuto: false,
      backdrop: `rgba(0,0,0,0.6) left top no-repeat`,
      customClass: {
        popup: 'terms-popup',
        title: 'terms-title',
        htmlContainer: 'terms-content',
        closeButton: 'terms-close-button'
      },
      didOpen: () => {
        const backdrop = document.querySelector('.swal2-container');
        if (backdrop) {
          backdrop.style.backdropFilter = 'blur(8px)';
          backdrop.style.webkitBackdropFilter = 'blur(8px)';
        }
        const popup = document.querySelector('.swal2-popup');
        if (popup) {
          popup.style.maxHeight = '85vh';
          popup.style.height = '85vh';
          popup.style.maxWidth = '1200px';
        }
        const container = document.querySelector('.swal2-html-container');
        if (container) {
          container.style.maxHeight = 'calc(90vh - 120px)';
          container.style.overflowY = 'auto';
        }
      }
    });
  };

  const handleAddNewUser = async () => {
    if (!newUserData.full_name || !newUserData.email) {
      return Swal.fire('Error', 'Please fill in all fields for the new user', 'error');
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/users/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newUserData,
          password: "123456",
          role_type: 'Bid User',
          created_by: user.role_type === "admin" ? user.id || user._id : user.created_by
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      Swal.fire('Success', 'New bid user created successfully!', 'success');
      setShowAddUserForm(false);
      setNewUserData({
        full_name: '',
        email: '',
        password: '',
        project_type: project.project_type || ''
      });
      loadBidUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      Swal.fire('Error', error.message || 'Failed to create user', 'error');
    }
  };

  const handleSubmit = async () => {
    if (isBidUser && !acceptedTerms) {
      return Swal.fire('Error', 'Please accept the terms and conditions to proceed', 'error');
    }

    if (!formData.submitted_by_id || !formData.bid_value) {
      return Swal.fire('Error', 'Please fill in all required fields', 'error');
    }

    setLoading(true);
    try {
      const bidData = {
        project_id: project.id,
        submitted_by_id: formData.submitted_by_id,
        customer_request: formData.customer_request || '',
        bid_value: parseFloat(formData.bid_value)
      };
      await onSubmit(bidData);
      Swal.fire('Success', 'Bid submitted successfully!', 'success');
      onClose();
    } catch (error) {
      console.error('Error submitting bid:', error);
      Swal.fire('Error', error.message || 'Failed to submit bid', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-lg"
      >
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Submit Bid - {project.project_name}</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* {canSelectBidder && ( */}
              <div>
                <Label htmlFor="submitted_by_id"> Select Bidder {!formData.submitted_by_id && <span className="text-red-500">*</span>}</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.submitted_by_id}
                    onValueChange={(value) => setFormData({ ...formData, submitted_by_id: value })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a bid user" />
                    </SelectTrigger>
                    <SelectContent>
                      {bidUsers.map((bidUser) => (
                        <SelectItem key={bidUser._id} value={bidUser._id}>
                          {bidUser.full_name} ({bidUser.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddUserForm(!showAddUserForm)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {/* )} */}

              {showAddUserForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 border rounded-lg p-4 bg-blue-50"
                >
                  <h3 className="font-semibold text-sm text-gray-700temp">Add New Bid User</h3>

                  <div>
                    <Label htmlFor="new_user_name">Bidder Name {!newUserData.full_name && <span className="text-red-500">*</span>}</Label>
                    <Input
                      id="new_user_name"
                      value={newUserData.full_name}
                      onChange={(e) => setNewUserData({ ...newUserData, full_name: e.target.value })}
                      placeholder="Enter bidder name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="new_user_email"> Bidder Email {!newUserData.email && <span className="text-red-500">*</span>}</Label>
                    <Input
                      id="new_user_email"
                      type="email"
                      value={newUserData.email}
                      onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                      placeholder="Enter bidder email"
                    />
                  </div>

                  {/* <div>
                    <Label htmlFor="new_user_password">Password *</Label>
                    <Input
                      id="new_user_password"
                      type="password"
                      value={newUserData.password}
                      onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                      placeholder="Enter password"
                    />
                  </div> */}

                  <div className="flex gap-2 justify-end pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowAddUserForm(false);
                        setNewUserData({
                          full_name: '',
                          email: '',
                          password: '',
                          project_type: project.project_type || ''
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddNewUser}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Create User
                    </Button>
                  </div>
                </motion.div>
              )}

              <div>
                <Label htmlFor="customer_request">Customer Request</Label>
                <Textarea
                  id="customer_request"
                  value={formData.customer_request}
                  onChange={(e) => setFormData({ ...formData, customer_request: e.target.value })}
                  placeholder="Enter any specific requirements or requests"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="bid_value"> Bid Value ($) {!formData.bid_value && <span className="text-red-500">*</span>}</Label>
                <Input
                  id="bid_value"
                  type="number"
                  step="0.01"
                  value={formData.bid_value}
                  onChange={(e) => setFormData({ ...formData, bid_value: e.target.value })}
                  placeholder="Enter bid amount"
                />
                {project.estimated_value && (
                  <p className="text-sm text-gray-500temp mt-1">
                    Estimated Project Value: {formatCurrency(project.estimated_value)}
                  </p>
                )}
              </div>

              {currentDivision && (
                <div className="border rounded-lg p-3 bg-blue-50 border-blue-200">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="text-blue-900 font-medium">Division: {currentDivision.display_name}</p>
                      <p className="text-blue-700 text-xs mt-1">
                        Terms and conditions apply for this project type
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isBidUser && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="terms" className="text-sm text-gray-700temp cursor-pointer">
                      I agree to the{' '}
                      <a
                        href="#"
                        onClick={showTermsAndConditions}
                        className="text-blue-600 hover:text-blue-700 underline font-medium"
                      >
                        Terms and Conditions
                      </a>
                      {' *'}
                    </label>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={loading || !acceptedTerms}
                    >
                      {loading ? 'Submitting...' : 'Submit Bid'}
                    </Button>
                  </div>
                </div>
              )}

              {/* {canSelectBidder && ( */}
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Submit Bid'}
                </Button>
              </div>
              {/* )} */}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
