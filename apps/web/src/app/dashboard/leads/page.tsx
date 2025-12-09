"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { FeatureLocked } from "@/components/FeatureLocked";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  useSensor,
  useSensors,
  PointerSensor,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { downloadQuotePDF } from "@/lib/pdf-generator";
import { Download, Trash2 } from "lucide-react";

type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  stage: string;
  priority: string;
  source: string | null;
  createdAt: string;
  messages: Array<{
    id: string;
    subject: string | null;
    content: string;
    createdAt: string;
  }>;
};

const STAGES = [
  { id: "new", label: "New", color: "bg-blue-500" },
  { id: "contacted", label: "Contacted", color: "bg-purple-500" },
  { id: "qualified", label: "Qualified", color: "bg-green-500" },
  { id: "won", label: "Won", color: "bg-emerald-500" },
  { id: "lost", label: "Lost", color: "bg-gray-500" },
];

function DroppableStage({ id, stage, count, totalLeads, children }: any) {
  const { setNodeRef } = useDroppable({ id });
  
  return (
    <div className="flex flex-col">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-3 h-3 rounded-full ${stage.color}`} />
          <h2 className="font-semibold text-lg">{stage.label}</h2>
          <Badge variant="secondary" className="ml-auto">
            {count}
          </Badge>
        </div>
        <div className="h-1 bg-gray-200 rounded-full">
          <div
            className={`h-full rounded-full ${stage.color}`}
            style={{
              width: `${(count / Math.max(totalLeads, 1)) * 100}%`,
            }}
          />
        </div>
      </div>

      <div
        ref={setNodeRef}
        className="space-y-3 flex-1 min-h-[200px] p-2 bg-gray-50 rounded-lg"
      >
        {children}
        {count === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">
            No leads in this stage
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableLeadCard({ lead, stage, onClick, getPriorityColor, updateLeadStage }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card 
        className="p-4 hover:shadow-lg transition-shadow cursor-move"
        onClick={onClick}
      >
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold">{lead.name}</h3>
            <Badge variant={getPriorityColor(lead.priority)}>
              {lead.priority}
            </Badge>
          </div>

          {lead.email && (
            <p className="text-sm text-gray-600 truncate">
              {lead.email}
            </p>
          )}

          {lead.phone && (
            <p className="text-sm text-gray-600">{lead.phone}</p>
          )}

          {lead.messages[0] && (
            <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
              <p className="font-medium truncate">
                {lead.messages[0].subject}
              </p>
              <p className="truncate mt-1">
                {lead.messages[0].content.substring(0, 60)}...
              </p>
            </div>
          )}

          <div className="flex gap-2 mt-3">
            {stage.id !== "new" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const currentIndex = STAGES.findIndex(
                    (s) => s.id === stage.id
                  );
                  if (currentIndex > 0) {
                    updateLeadStage(
                      lead.id,
                      STAGES[currentIndex - 1].id
                    );
                  }
                }}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
              >
                ← Back
              </button>
            )}
            {stage.id !== "won" && stage.id !== "lost" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const currentIndex = STAGES.findIndex(
                    (s) => s.id === stage.id
                  );
                  if (currentIndex < STAGES.length - 1) {
                    updateLeadStage(
                      lead.id,
                      STAGES[currentIndex + 1].id
                    );
                  }
                }}
                className="text-xs px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:opacity-90 rounded ml-auto"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function LeadsPage() {
  const { user } = useUser();
  const { hasFeature, plan, loading: subscriptionLoading } = useSubscription();
  const [leads, setLeads] = useState<Lead[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leadDetails, setLeadDetails] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [newLead, setNewLead] = useState({
    name: "",
    email: "",
    phone: "",
    priority: "medium",
    source: "manual",
  });
  const [showQuoteBuilder, setShowQuoteBuilder] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    title: "",
    description: "",
    notes: "",
    taxRate: 0,
    discount: 0,
    expiresAt: "",
    items: [] as Array<{ description: string; quantity: number; unitPrice: number }>,
  });
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatingQuote, setGeneratingQuote] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (user?.id) {
      fetchLeads();
    }
  }, [user]);

  const fetchLeads = async () => {
    try {
      const response = await fetch(
        `http://localhost:3001/leads?userId=${user?.id}`
      );
      const data = await response.json();
      setLeads(data || []);
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStage = async (leadId: string, newStage: string) => {
    try {
      await fetch(`http://localhost:3001/leads/${leadId}/stage?userId=${user?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      fetchLeads();
    } catch (error) {
      console.error("Failed to update lead:", error);
    }
  };

  const getLeadsByStage = (stage: string) => {
    return leads?.filter((lead) => lead.stage === stage) || [];
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const leadId = active.id as string;
    const newStage = over.id as string;

    const lead = leads?.find((l) => l.id === leadId);
    if (lead && lead.stage !== newStage) {
      updateLeadStage(leadId, newStage);
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeLead = leads?.find((lead) => lead.id === activeId);

  useEffect(() => {
    if (selectedLeadId) {
      fetchLeadDetails(selectedLeadId);
    }
  }, [selectedLeadId]);

  const fetchLeadDetails = async (leadId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/leads/${leadId}?userId=${user?.id}`);
      const data = await response.json();
      console.log("Lead details received:", data);
      console.log("Messages:", data.messages);
      console.log("Quotes:", data.quotes);
      setLeadDetails(data);
      setNotes(data.notes || "");
      // Reset quote builder
      setShowQuoteBuilder(false);
      setQuoteForm({
        title: "",
        description: "",
        notes: "",
        taxRate: 0,
        discount: 0,
        expiresAt: "",
        items: [],
      });
    } catch (error) {
      console.error("Failed to fetch lead details:", error);
    }
  };

  const saveNotes = async () => {
    if (!selectedLeadId) return;
    try {
      await fetch(`http://localhost:3001/leads/${selectedLeadId}?userId=${user?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      fetchLeadDetails(selectedLeadId);
    } catch (error) {
      console.error("Failed to save notes:", error);
    }
  };

  const createNewLead = async () => {
    if (!user?.id || !newLead.name) return;
    try {
      await fetch(`http://localhost:3001/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newLead,
          userId: user.id,
        }),
      });
      setShowNewLeadModal(false);
      setNewLead({ name: "", email: "", phone: "", priority: "medium", source: "manual" });
      fetchLeads();
    } catch (error) {
      console.error("Failed to create lead:", error);
    }
  };

  const handleLeadClick = (leadId: string) => {
    setSelectedLeadId(leadId);
  };

  const closeModal = () => {
    setSelectedLeadId(null);
    setLeadDetails(null);
  };

  // Quote builder functions
  const addQuoteItem = () => {
    setQuoteForm({
      ...quoteForm,
      items: [...quoteForm.items, { description: "", quantity: 1, unitPrice: 0 }],
    });
  };

  const removeQuoteItem = (index: number) => {
    setQuoteForm({
      ...quoteForm,
      items: quoteForm.items.filter((_, i) => i !== index),
    });
  };

  const updateQuoteItem = (index: number, field: string, value: any) => {
    const updatedItems = [...quoteForm.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setQuoteForm({ ...quoteForm, items: updatedItems });
  };

  const calculateSubtotal = () => {
    return quoteForm.items.reduce((sum, item) => {
      return sum + ((item.quantity || 0) * (item.unitPrice || 0));
    }, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * (quoteForm.taxRate / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() - quoteForm.discount;
  };

  const createQuote = async () => {
    if (!selectedLeadId || quoteForm.items.length === 0) return;

    try {
      await fetch(`http://localhost:3001/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: selectedLeadId,
          title: quoteForm.title,
          description: quoteForm.description,
          notes: quoteForm.notes,
          items: quoteForm.items.map(item => ({
            description: item.description,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
          })),
          taxRate: quoteForm.taxRate,
          discount: quoteForm.discount,
          expiresAt: quoteForm.expiresAt ? new Date(quoteForm.expiresAt) : undefined,
        }),
      });

      // Refresh lead details to show new quote
      fetchLeadDetails(selectedLeadId);
      setShowQuoteBuilder(false);
      setQuoteForm({
        title: "",
        description: "",
        notes: "",
        taxRate: 0,
        discount: 0,
        expiresAt: "",
        items: [],
      });
    } catch (error) {
      console.error("Failed to create quote:", error);
    }
  };

  const sendQuote = async (quoteId: string) => {
    try {
      await fetch(`http://localhost:3001/quotes/${quoteId}/send`, {
        method: "POST",
      });
      // Refresh lead details to update quote status
      if (selectedLeadId) {
        fetchLeadDetails(selectedLeadId);
      }
    } catch (error) {
      console.error("Failed to send quote:", error);
    }
  };

  const deleteQuote = async (quoteId: string) => {
    if (!confirm("Are you sure you want to delete this quote?")) return;
    
    try {
      await fetch(`http://localhost:3001/quotes/${quoteId}?userId=${user?.id}`, {
        method: "DELETE",
      });
      // Refresh lead details to remove deleted quote
      if (selectedLeadId) {
        fetchLeadDetails(selectedLeadId);
      }
    } catch (error) {
      console.error("Failed to delete quote:", error);
    }
  };

  const generateQuoteWithAI = async () => {
    if (!aiPrompt.trim()) return;
    
    setGeneratingQuote(true);
    try {
      const response = await fetch(`http://localhost:3001/ai/generate-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          businessType: user?.publicMetadata?.businessType || "general contractor",
          conversationHistory: leadDetails?.messages?.slice(-3) || [],
          userId: user?.id,
        }),
      });

      const data = await response.json();
      
      // Populate the quote form with AI-generated data
      setQuoteForm({
        title: data.title || quoteForm.title,
        description: data.description || quoteForm.description,
        notes: data.notes || quoteForm.notes,
        taxRate: data.taxRate || quoteForm.taxRate,
        discount: data.discount || 0,
        expiresAt: quoteForm.expiresAt,
        items: data.items || [],
      });
      
      setAiPrompt("");
    } catch (error) {
      console.error("Failed to generate quote:", error);
      alert("Failed to generate quote. Please try again.");
    } finally {
      setGeneratingQuote(false);
    }
  };

  if (loading || subscriptionLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading leads...</div>
        </div>
      </div>
    );
  }

  // Check if user has access to lead tracking feature
  if (!hasFeature('lead_tracking')) {
    return (
      <FeatureLocked
        feature="Lead Tracking & CRM"
        requiredPlan="Starter"
        description="Track and manage your leads through the sales pipeline with our comprehensive CRM system."
      />
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Leads CRM
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your leads through the sales pipeline
          </p>
        </div>
        <Button
          onClick={() => setShowNewLeadModal(true)}
          className="bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90"
        >
          + New Lead
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="grid grid-cols-5 gap-4">
        {STAGES.map((stage) => {
          const stageLeads = getLeadsByStage(stage.id);
          return (
            <DroppableStage key={stage.id} id={stage.id} stage={stage} count={stageLeads.length} totalLeads={leads.length}>
              {stageLeads.map((lead) => (
                <DraggableLeadCard 
                  key={lead.id} 
                  lead={lead} 
                  stage={stage}
                  onClick={() => handleLeadClick(lead.id)}
                  getPriorityColor={getPriorityColor}
                  updateLeadStage={updateLeadStage}
                />
              ))}
            </DroppableStage>
          );
        })}
      </div>

      <DragOverlay>
        {activeLead ? (
          <Card className="p-4 shadow-2xl opacity-90 rotate-3">
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold">{activeLead.name}</h3>
                <Badge variant={getPriorityColor(activeLead.priority)}>
                  {activeLead.priority}
                </Badge>
              </div>
              {activeLead.email && (
                <p className="text-sm text-gray-600 truncate">
                  {activeLead.email}
                </p>
              )}
            </div>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>

    <Dialog open={!!selectedLeadId} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          {leadDetails ? (
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-2xl">{leadDetails.name}</DialogTitle>
                <DialogDescription className="mt-2">
                  {leadDetails.email && (
                    <span className="block">{leadDetails.email}</span>
                  )}
                  {leadDetails.phone && (
                    <span className="block">{leadDetails.phone}</span>
                  )}
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant={getPriorityColor(leadDetails.priority)}>
                  {leadDetails.priority}
                </Badge>
                <Badge variant="outline">{leadDetails.stage}</Badge>
              </div>
            </div>
          ) : (
            <DialogTitle>Loading...</DialogTitle>
          )}
        </DialogHeader>
        {leadDetails ? (
          <>

            <div className="space-y-6 mt-4">
              {/* Lead Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Source</p>
                  <p className="font-medium">{leadDetails.source || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium">
                    {leadDetails.createdAt 
                      ? new Date(leadDetails.createdAt).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
              </div>

              {/* Messages Timeline */}
              <div>
                <h3 className="text-lg font-semibold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Conversation History
                </h3>
                <div className="space-y-4">
                  {leadDetails.messages && leadDetails.messages.length > 0 ? (
                    leadDetails.messages.map((message: any) => (
                      <Card key={message.id} className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-sm">
                                {message.direction === "inbound" ? "From" : "To"}{" "}
                                {message.fromEmail || message.toEmail}
                              </p>
                              {message.subject && (
                                <p className="font-medium mt-1">{message.subject}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">
                                {new Date(message.createdAt).toLocaleDateString()}{" "}
                                {new Date(message.createdAt).toLocaleTimeString()}
                              </p>
                              <Badge variant="outline" className="mt-1">
                                {message.channel}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-sm text-gray-700 mt-2 p-3 bg-gray-50 rounded">
                            {message.content}
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      No messages yet
                    </p>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Notes</h3>
                <Textarea
                  placeholder="Add internal notes about this lead..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full"
                />
                <Button
                  onClick={saveNotes}
                  className="mt-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90"
                >
                  Save Notes
                </Button>
              </div>

              {/* Quotes */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Quotes</h3>
                  <Button
                    onClick={() => {
                      if (showQuoteBuilder) {
                        // Reset form when canceling
                        setQuoteForm({
                          title: "",
                          description: "",
                          notes: "",
                          taxRate: 0,
                          discount: 0,
                          expiresAt: "",
                          items: [],
                        });
                        setAiPrompt("");
                      }
                      setShowQuoteBuilder(!showQuoteBuilder);
                    }}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90"
                  >
                    {showQuoteBuilder ? "Cancel" : "+ New Quote"}
                  </Button>
                </div>

                {showQuoteBuilder && (
                  <Card className="p-4 mb-4 border-2 border-purple-200">
                    <div className="space-y-4">
                      {/* AI Quote Generator */}
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-purple-200">
                        <label className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          ✨ AI Quote Generator
                        </label>
                        <div className="flex gap-2 mt-2">
                          <Textarea
                            placeholder="Describe the work... (e.g., 'Install concrete driveway 20x30 feet with stamped finish' or 'HVAC system replacement for 2000 sq ft home')"
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            rows={2}
                            className="flex-1"
                            disabled={generatingQuote}
                          />
                          <Button
                            onClick={generateQuoteWithAI}
                            disabled={!aiPrompt.trim() || generatingQuote}
                            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 whitespace-nowrap"
                          >
                            {generatingQuote ? "Generating..." : "Generate"}
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          AI will generate line items, pricing, and description based on your input
                        </p>
                      </div>

                      <div className="border-t pt-4">
                        <p className="text-sm text-gray-500 mb-4">Or manually create a quote:</p>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Title</label>
                        <Input
                          placeholder="Project Name"
                          value={quoteForm.title}
                          onChange={(e) =>
                            setQuoteForm({ ...quoteForm, title: e.target.value })
                          }
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <Textarea
                          placeholder="Brief description of the work..."
                          value={quoteForm.description}
                          onChange={(e) =>
                            setQuoteForm({ ...quoteForm, description: e.target.value })
                          }
                          rows={2}
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium">Line Items</label>
                          <Button
                            onClick={addQuoteItem}
                            variant="outline"
                            size="sm"
                          >
                            + Add Item
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {quoteForm.items.map((item, index) => (
                            <Card key={index} className="p-3">
                              <div className="grid grid-cols-12 gap-2 items-center">
                                <div className="col-span-5">
                                  <Input
                                    placeholder="Description"
                                    value={item.description}
                                    onChange={(e) =>
                                      updateQuoteItem(index, "description", e.target.value)
                                    }
                                  />
                                </div>
                                <div className="col-span-2">
                                  <Input
                                    type="number"
                                    placeholder="Qty"
                                    value={item.quantity}
                                    onChange={(e) =>
                                      updateQuoteItem(index, "quantity", parseFloat(e.target.value))
                                    }
                                  />
                                </div>
                                <div className="col-span-2">
                                  <Input
                                    type="number"
                                    placeholder="Price"
                                    value={item.unitPrice}
                                    onChange={(e) =>
                                      updateQuoteItem(index, "unitPrice", parseFloat(e.target.value))
                                    }
                                  />
                                </div>
                                <div className="col-span-2 text-right font-medium">
                                  ${((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}
                                </div>
                                <button
                                  onClick={() => removeQuoteItem(index)}
                                  className="col-span-1 text-red-500 hover:text-red-700"
                                >
                                  ×
                                </button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Tax Rate (%)</label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={quoteForm.taxRate}
                            onChange={(e) =>
                              setQuoteForm({ ...quoteForm, taxRate: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Discount ($)</label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={quoteForm.discount}
                            onChange={(e) =>
                              setQuoteForm({ ...quoteForm, discount: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Valid Until</label>
                        <Input
                          type="date"
                          value={quoteForm.expiresAt}
                          onChange={(e) =>
                            setQuoteForm({ ...quoteForm, expiresAt: e.target.value })
                          }
                        />
                      </div>

                      <div className="border-t pt-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span className="font-medium">${calculateSubtotal().toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tax ({quoteForm.taxRate}%):</span>
                            <span className="font-medium">${calculateTax().toFixed(2)}</span>
                          </div>
                          {quoteForm.discount > 0 && (
                            <div className="flex justify-between text-green-600">
                              <span>Discount:</span>
                              <span className="font-medium">-${quoteForm.discount.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-lg font-bold border-t pt-2">
                            <span>Total:</span>
                            <span>${calculateTotal().toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Notes</label>
                        <Textarea
                          placeholder="Additional notes or terms..."
                          value={quoteForm.notes}
                          onChange={(e) =>
                            setQuoteForm({ ...quoteForm, notes: e.target.value })
                          }
                          rows={3}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={createQuote}
                          className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90"
                          disabled={quoteForm.items.length === 0}
                        >
                          Create Quote
                        </Button>
                        <Button
                          onClick={() => setShowQuoteBuilder(false)}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                {leadDetails.quotes && leadDetails.quotes.length > 0 ? (
                  <div className="space-y-2">
                    {leadDetails.quotes.map((quote: any) => (
                      <Card key={quote.id} className="p-4 hover:border-purple-200 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{quote.title || `Quote ${quote.quoteNumber}`}</p>
                              <Badge variant={quote.status === "sent" ? "default" : "outline"}>
                                {quote.status}
                              </Badge>
                            </div>
                            {quote.description && (
                              <p className="text-sm text-gray-600 mt-1">{quote.description}</p>
                            )}
                            <div className="mt-2 text-sm text-gray-500">
                              <span>{quote.items?.length || 0} items</span>
                              <span className="mx-2">•</span>
                              <span>Created {new Date(quote.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                              ${quote.total.toFixed(2)}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <Button
                                onClick={() => downloadQuotePDF(quote, "AutoStaff AI")}
                                size="sm"
                                variant="outline"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                PDF
                              </Button>
                              {quote.status === "draft" && (
                                <>
                                  <Button
                                    onClick={() => sendQuote(quote.id)}
                                    size="sm"
                                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90"
                                  >
                                    Send
                                  </Button>
                                  <Button
                                    onClick={() => deleteQuote(quote.id)}
                                    size="sm"
                                    variant="destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  !showQuoteBuilder && (
                    <p className="text-gray-500 text-center py-4">
                      No quotes yet. Click "New Quote" to create one.
                    </p>
                  )
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="text-lg">Loading lead details...</div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* New Lead Modal */}
    <Dialog open={showNewLeadModal} onOpenChange={setShowNewLeadModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Lead</DialogTitle>
          <DialogDescription>
            Manually add a new lead to your CRM
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium">Name *</label>
            <Input
              placeholder="John Doe"
              value={newLead.name}
              onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              placeholder="john@example.com"
              value={newLead.email}
              onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            <Input
              type="tel"
              placeholder="(555) 123-4567"
              value={newLead.phone}
              onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Priority</label>
            <Select
              value={newLead.priority}
              onValueChange={(value) => setNewLead({ ...newLead, priority: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              onClick={createNewLead}
              disabled={!newLead.name}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90"
            >
              Create Lead
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowNewLeadModal(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </div>
  );
}
