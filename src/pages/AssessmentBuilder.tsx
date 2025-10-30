import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, Job, AssessmentSection, Question } from "@/lib/db";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const AssessmentBuilder = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [previewMode, setPreviewMode] = useState(false);
  const [responses, setResponses] = useState<Record<string, unknown>>({});

  const [job, setJob] = useState<Job | null>(null);
  const [sections, setSections] = useState<AssessmentSection[]>([]);

  const loadAssessment = useCallback(async () => {
    const jobData = await db.jobs.get(jobId!);
    setJob(jobData);
    // Try to find an assessment record tied to this jobId. Previously we
    // used `get(jobId)` which assumes the assessment id equals the jobId.
    // In the seed/mirage logic assessments are stored with a generated id
    // and `jobId` field, so query by jobId to reliably load it.
    const assessment = await db.assessments.where('jobId').equals(jobId!).first();
    if (assessment?.sections) {
      setSections(assessment.sections as AssessmentSection[]);
    } else {
      setSections([
        {
          id: `section-${Date.now()}`,
          title: 'General Questions',
          questions: [],
        },
      ]);
    }
  }, [jobId]);

  useEffect(() => {
    loadAssessment();
  }, [loadAssessment]);

  const addSection = () => {
    setSections([...sections, {
      id: `section-${Date.now()}`,
      title: 'New Section',
      questions: [],
    }]);
  };

  const updateSection = (sectionId: string, updates: Partial<AssessmentSection>) => {
    setSections(sections.map(s => s.id === sectionId ? { ...s, ...updates } : s));
  };

  const deleteSection = (sectionId: string) => {
    setSections(sections.filter(s => s.id !== sectionId));
  };

  const addQuestion = (sectionId: string) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          questions: [...s.questions, {
            id: `q-${Date.now()}`,
            type: 'short-text',
            question: '',
            options: ['Option 1', 'Option 2'],
            required: false,
          }],
        };
      }
      return s;
    }));
  };

  const updateQuestion = (sectionId: string, questionId: string, updates: Partial<Question>) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          questions: s.questions.map((q: Question) => q.id === questionId ? { ...q, ...updates } : q),
        };
      }
      return s;
    }));
  };

  const deleteQuestion = (sectionId: string, questionId: string) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          questions: s.questions.filter(q => q.id !== questionId),
        };
      }
      return s;
    }));
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/assessments/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
      });

      if (!res.ok) throw new Error('Save failed');

      // Read back the saved assessment (mirage updates Dexie). Prefer the
      // response body when available to immediately reflect saved state.
      const saved = await res.json();
      if (saved?.sections) setSections(saved.sections as AssessmentSection[]);

      toast.success('Assessment saved successfully');
    } catch (error) {
      toast.error('Failed to save assessment');
    }
  };

  const shouldShowQuestion = (question: Question): boolean => {
    if (!question.conditionalOn) return true;
    const dependentValue = responses[question.conditionalOn.questionId];
    return dependentValue === question.conditionalOn.value;
  };

  const renderPreview = () => (
    <div className="space-y-6">
      {sections.map((section) => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {section.questions.filter(shouldShowQuestion).map((question: Question) => (
              <div key={question.id}>
                <Label>
                  {question.question}
                  {question.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {question.type === 'short-text' && (
                  <Input
                    maxLength={question.maxLength}
                    onChange={(e) => setResponses({...responses, [question.id]: e.target.value})}
                  />
                )}
                {question.type === 'long-text' && (
                  <Textarea
                    maxLength={question.maxLength}
                    onChange={(e) => setResponses({...responses, [question.id]: e.target.value})}
                  />
                )}
                {question.type === 'numeric' && (
                  <Input
                    type="number"
                    min={question.minValue}
                    max={question.maxValue}
                    onChange={(e) => setResponses({...responses, [question.id]: e.target.value})}
                  />
                )}
                {(question.type === 'single' || question.type === 'multi') && (
                  <Select onValueChange={(v) => setResponses({...responses, [question.id]: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      {question.options?.map((opt: string) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {question.type === 'file' && (
                  <Input type="file" disabled />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="p-8 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-start"
      >
        <div>
          <Button variant="ghost" onClick={() => navigate('/assessments')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assessments
          </Button>
          <h1 className="text-4xl font-bold mb-2">Assessment Builder</h1>
          <p className="text-muted-foreground">{job?.title}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreviewMode(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSave}>Save Assessment</Button>
        </div>
      </motion.div>

      <div className="space-y-4">
        {sections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Input
                  value={section.title}
                  onChange={(e) => updateSection(section.id, { title: e.target.value })}
                  className="text-lg font-semibold"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteSection(section.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {section.questions.map((question: Question) => (
                <Card key={question.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Input
                        value={question.question}
                        onChange={(e) => updateQuestion(section.id, question.id, { question: e.target.value })}
                        placeholder="Question text"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteQuestion(section.id, question.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Type</Label>
                        <Select
                          value={String(question.type)}
                          onValueChange={(v: string) => updateQuestion(section.id, question.id, { type: v as unknown as Question['type'] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Single Choice</SelectItem>
                            <SelectItem value="multi">Multiple Choice</SelectItem>
                            <SelectItem value="short-text">Short Text</SelectItem>
                            <SelectItem value="long-text">Long Text</SelectItem>
                            <SelectItem value="numeric">Numeric</SelectItem>
                            <SelectItem value="file">File Upload</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={question.required}
                          onCheckedChange={(checked) => updateQuestion(section.id, question.id, { required: checked })}
                        />
                        <Label>Required</Label>
                      </div>
                    </div>
                    {(question.type === 'single' || question.type === 'multi') && (
                      <div>
                        <Label>Options (comma-separated)</Label>
                        <Input
                          value={question.options?.join(', ')}
                          onChange={(e) => updateQuestion(section.id, question.id, { options: e.target.value.split(',').map(s => s.trim()) })}
                        />
                      </div>
                    )}
                  </div>
                </Card>
              ))}
              <Button variant="outline" onClick={() => addQuestion(section.id)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </CardContent>
          </Card>
        ))}
        <Button onClick={addSection}>
          <Plus className="h-4 w-4 mr-2" />
          Add Section
        </Button>
      </div>

      <Dialog open={previewMode} onOpenChange={setPreviewMode}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assessment Preview</DialogTitle>
          </DialogHeader>
          {renderPreview()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssessmentBuilder;
