import { useState } from 'react';
import { FolderOpen, Plus, File, Image, Link, FileText } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';

export default function ProjectsView({ isDark = false }) {
  const [projects, setProjects] = useState([
    { id: '1', name: 'Marketing Campaign', items: [
      { id: 'i1', type: 'file', name: 'Proposal.pdf', url: '#' },
      { id: 'i2', type: 'image', name: 'Banner.png', url: '#' },
      { id: 'i3', type: 'link', name: 'Google Drive', url: 'https://drive.google.com' },
    ]},
    { id: '2', name: 'Product Launch', items: [
      { id: 'i4', type: 'doc', name: 'Launch Plan.docx', url: '#' },
    ]},
  ]);
  const [newProjectName, setNewProjectName] = useState('');

  const bgColor = isDark ? 'bg-[#111111]' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-[#111111]';
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-[#1a1a1a] border-[#333] hover:border-[#444]' : 'bg-white border-gray-200 hover:border-gray-300';
  const iconBg = isDark ? 'bg-[#2a2a2a]' : 'bg-gray-100';

  const addProject = () => {
    if (!newProjectName.trim()) return;
    setProjects(prev => [...prev, {
      id: Date.now().toString(),
      name: newProjectName,
      items: []
    }]);
    setNewProjectName('');
  };

  const getIcon = (type) => {
    const iconColor = isDark ? 'text-gray-400' : '';
    switch (type) {
      case 'image': return <Image className={`w-4 h-4 text-blue-500`} />;
      case 'link': return <Link className={`w-4 h-4 text-green-500`} />;
      case 'doc': return <FileText className={`w-4 h-4 text-orange-500`} />;
      default: return <File className={`w-4 h-4 ${iconColor || 'text-gray-500'}`} />;
    }
  };

  return (
    <div className={`h-full flex flex-col p-6 ${bgColor}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-semibold ${textColor}`}>Projects</h1>
          <p className={`text-sm ${mutedText} mt-1`}>Organize files, links, and resources</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className={`rounded-full ${isDark ? 'bg-white text-[#111] hover:bg-gray-100' : 'bg-[#111111] hover:bg-[#333] text-white'}`}>
              <Plus className="w-4 h-4 mr-2" /> New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="flex gap-2 mt-4">
              <Input
                placeholder="Project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addProject()}
              />
              <Button onClick={addProject} className="bg-[#111111]">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <div
            key={project.id}
            className={`border rounded-xl p-4 hover:shadow-sm transition-all cursor-pointer ${cardBg}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
                <FolderOpen className={`w-5 h-5 ${textColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-medium ${textColor} truncate`}>{project.name}</h3>
                <p className={`text-xs ${mutedText}`}>{project.items.length} items</p>
              </div>
            </div>
            
            <div className="space-y-1">
              {project.items.slice(0, 3).map((item) => (
                <div key={item.id} className={`flex items-center gap-2 text-sm ${mutedText}`}>
                  {getIcon(item.type)}
                  <span className="truncate">{item.name}</span>
                </div>
              ))}
              {project.items.length > 3 && (
                <p className={`text-xs ${mutedText} pl-6`}>+{project.items.length - 3} more</p>
              )}
            </div>
          </div>
        ))}

        {projects.length === 0 && (
          <div className={`col-span-full flex flex-col items-center justify-center py-16 ${mutedText}`}>
            <FolderOpen className="w-12 h-12 mb-3 opacity-30" />
            <p>No projects yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
