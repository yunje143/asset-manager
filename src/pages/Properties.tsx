import React, { useEffect, useState } from "react";
import { getProperties, createProperty, updateProperty, deleteProperty } from "../lib/api";
import { Property } from "../types";
import {
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Building2,
} from "lucide-react";

export function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    type: "Mansion",
    purchase_price: "",
    purchase_date: new Date().toISOString().split("T")[0],
    useful_life: "47",
  });

  useEffect(() => {
    loadProperties();
  }, []);

  async function loadProperties() {
    try {
      setLoading(true);
      setError(null);
      const data = await getProperties();
      setProperties(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load properties");
      console.error("Properties error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProperty(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError(null);
      
      if (editingPropertyId) {
        // Update existing property
        const updatedProperty = await updateProperty(
          editingPropertyId,
          formData.name,
          formData.address,
          formData.type,
          parseFloat(formData.purchase_price),
          formData.purchase_date,
          parseInt(formData.useful_life)
        );
        setProperties(properties.map((p) => (p.id === editingPropertyId ? updatedProperty : p)));
      } else {
        // Create new property
        const newProperty = await createProperty(
          formData.name,
          formData.address,
          formData.type,
          parseFloat(formData.purchase_price),
          formData.purchase_date,
          parseInt(formData.useful_life)
        );
        setProperties([...properties, newProperty]);
      }
      
      setShowForm(false);
      setEditingPropertyId(null);
      setFormData({
        name: "",
        address: "",
        type: "Mansion",
        purchase_price: "",
        purchase_date: new Date().toISOString().split("T")[0],
        useful_life: "47",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save property");
      console.error("Save property error:", err);
    }
  }

  function handleEditProperty(property: Property) {
    setEditingPropertyId(property.id);
    setFormData({
      name: property.name,
      address: property.address,
      type: property.type,
      purchase_price: property.purchase_price.toString(),
      purchase_date: property.purchase_date,
      useful_life: property.useful_life.toString(),
    });
    setShowForm(true);
  }

  function handleCancelEdit() {
    setShowForm(false);
    setEditingPropertyId(null);
    setFormData({
      name: "",
      address: "",
      type: "Mansion",
      purchase_price: "",
      purchase_date: new Date().toISOString().split("T")[0],
      useful_life: "47",
    });
  }

  function handlePriceChange(value: string) {
    // 数字だけを抽出
    const numericValue = value.replace(/\D/g, '');
    setFormData({
      ...formData,
      purchase_price: numericValue,
    });
  }

  function getDisplayPrice(): string {
    return formData.purchase_price
      ? parseInt(formData.purchase_price).toLocaleString('ja-JP')
      : '';
  }

  async function handleDeleteProperty(id: number) {
    if (confirm("Are you sure you want to delete this property?")) {
      try {
        setError(null);
        await deleteProperty(id);
        setProperties(properties.filter((p) => p.id !== id));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete property"
        );
        console.error("Delete property error:", err);
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading properties...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Properties</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Property
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Add/Edit Property Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingPropertyId ? "Edit Property" : "Add New Property"}
          </h3>
          <form onSubmit={handleSaveProperty} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Downtown Apartment"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 123 Main St"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Mansion</option>
                  <option>Tenant</option>
                  <option>Stay</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Price (¥)
                </label>
                <input
                  type="text"
                  required
                  value={getDisplayPrice()}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.purchase_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      purchase_date: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Useful Life (years)
                </label>
                <input
                  type="number"
                  required
                  value={formData.useful_life}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      useful_life: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="47"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                {editingPropertyId ? "Update Property" : "Add Property"}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex-1 bg-gray-200 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Properties Grid */}
      {properties.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No properties yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Add your first property to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onEdit={() => handleEditProperty(property)}
              onDelete={() => handleDeleteProperty(property.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PropertyCardProps {
  property: Property;
  onEdit: () => void;
  onDelete: () => void;
}

function PropertyCard({ property, onEdit, onDelete }: PropertyCardProps) {
  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {property.name}
            </h3>
            <p className="text-sm text-gray-500">{property.address}</p>
          </div>
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
            {property.type}
          </span>
        </div>

        <div className="space-y-2 mb-6 pb-6 border-b border-gray-200">
          <DetailRow label="Purchase Price" value={`¥${property.purchase_price.toLocaleString('ja-JP', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}`} />
          <DetailRow label="Purchase Date" value={property.purchase_date} />
          <DetailRow label="Useful Life" value={`${property.useful_life} years`} />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Edit2 className="w-4 h-4" />
            <span>Edit</span>
          </button>
          <button
            onClick={onDelete}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
