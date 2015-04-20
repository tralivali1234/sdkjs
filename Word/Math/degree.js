"use strict";

function CMathDegreePr()
{
    this.type = DEGREE_SUPERSCRIPT;
}

CMathDegreePr.prototype.Set_FromObject = function(Obj)
{
    if (DEGREE_SUPERSCRIPT === Obj.type || DEGREE_SUBSCRIPT === Obj.type)
        this.type = Obj.type;
    else
        this.type = DEGREE_SUPERSCRIPT;
};

CMathDegreePr.prototype.Copy = function()
{
    var NewPr = new CMathDegreePr();
    NewPr.type = this.type;
    return NewPr;
};

CMathDegreePr.prototype.Write_ToBinary = function(Writer)
{
    // Long : type
    Writer.WriteLong(this.type);
};

CMathDegreePr.prototype.Read_FromBinary = function(Reader)
{
    // Long : type
    this.type = Reader.GetLong(Reader);
};

function CDegreeBase(props, bInside)
{
    CDegreeBase.superclass.constructor.call(this, bInside);

    this.upBase = 0; // отступ сверху для основания
    this.upIter = 0; // отступ сверху для итератора

    this.Pr = new CMathDegreePr();

    this.baseContent = null;
    this.iterContent = null;

    this.bNaryInline = false;

    if(props !== null && typeof(props) !== "undefined")
        this.init(props);
}
Asc.extendClass(CDegreeBase, CMathBase);
CDegreeBase.prototype.init = function(props)
{
    this.setProperties(props);
    this.setDimension(1, 2);
};
CDegreeBase.prototype.fillContent = function()
{
    this.setDimension(1, 2);
    this.elements[0][0] = this.baseContent;
    this.elements[0][1] = this.iterContent;
};
CDegreeBase.prototype.PreRecalc = function(Parent, ParaMath, ArgSize, RPI, GapsInfo)
{
    this.Parent = Parent;
    this.ParaMath = ParaMath;

    this.Set_CompiledCtrPrp(Parent, ParaMath, RPI);

    this.ApplyProperties(RPI);

    if(this.bInside == false)
        GapsInfo.setGaps(this, this.TextPrControlLetter.FontSize);

    this.baseContent.PreRecalc(this, ParaMath, ArgSize, RPI);

    var ArgSzDegr = ArgSize.Copy();
    ArgSzDegr.decrease();

    var RPIDegr = RPI.Copy();
    RPIDegr.bDecreasedComp = true;

    this.bNaryInline = RPI.bNaryInline;

    this.iterContent.PreRecalc(this, ParaMath, ArgSzDegr, RPIDegr);
};
CDegreeBase.prototype.Resize = function(oMeasure, RPI)
{
    this.baseContent.Resize(oMeasure, RPI);

    this.iterContent.Resize(oMeasure, RPI);

    if(this.Pr.type === DEGREE_SUPERSCRIPT)
        this.GetSizeSup(oMeasure);
    else if(this.Pr.type === DEGREE_SUBSCRIPT)
        this.GetSizeSubScript(oMeasure);
};
CDegreeBase.prototype.recalculateSize = function(oMeasure)
{
    var Metric = new CMathBoundsMeasures();
    Metric.UpdateMetrics(this.baseContent.size);
    Metric.UpdateWidth(this.baseContent.size.width);

    var ResultSize;

    if(this.Pr.type === DEGREE_SUPERSCRIPT)
    {
        ResultSize = this.GetSizeSup(oMeasure, Metric);
    }
    else if(this.Pr.type === DEGREE_SUBSCRIPT)
    {
        ResultSize = this.GetSizeSubScript(oMeasure, Metric);
    }

    this.size.Set(ResultSize);
};
CDegreeBase.prototype.GetSizeSup = function(oMeasure, Metric)
{
    var iter       = this.iterContent.size,
        baseAsc    = Metric.Asc,
        baseHeight = Metric.H,
        baseWidth  = Metric.W;

    var mgCtrPrp = this.Get_TxtPrControlLetter();

    this.upBase = 0;
    this.upIter = 0;

    var bTextElement = false,
        lastElem;

    if(!this.baseContent.IsJustDraw())
    {
        lastElem = this.baseContent.GetLastElement();

        var BaseRun  = lastElem.Type == para_Math_Run && mgCtrPrp.FontSize == lastElem.Get_CompiledPr(false).FontSize;
        bTextElement = BaseRun || (lastElem.Type !== para_Math_Run && lastElem.IsJustDraw());
    }

    var PlH = 0.64*this.ParaMath.GetPlh(oMeasure, mgCtrPrp);
    //var UpBaseline = 1.65*shCenter; // расстояние от baseline основания до бейзлайна итератора
    var UpBaseline = 0.75*PlH; // расстояние от baseline основания до бейзлайна итератора

    if(bTextElement)
    {
        var last = lastElem.size,
            upBaseLast = 0,
            upBaseIter = 0;

        if( (last.ascent - UpBaseline) + (iter.height - iter.ascent) >  (last.ascent - 2/9*PlH) )
            upBaseLast = iter.height - (last.ascent - 2/9*PlH);
        else if(UpBaseline + iter.ascent > last.ascent)
            upBaseLast = UpBaseline + iter.ascent - last.ascent;
        else
            upBaseIter = last.ascent - UpBaseline - iter.ascent;

        if(upBaseLast + last.ascent > baseAsc)
        {
            this.upBase = upBaseLast - (baseAsc - last.ascent);
            this.upIter = upBaseIter;
        }
        else
        {
            this.upBase = 0;
            this.upIter = (baseAsc - upBaseLast - last.ascent) + upBaseIter;
        }
    }
    else
    {
        var shCenter = this.ParaMath.GetShiftCenter(oMeasure, mgCtrPrp);

        if(iter.height - iter.ascent + shCenter > baseAsc) // для дробей и т.п.
        {
            this.upBase = iter.height - (baseAsc - shCenter);
        }
        else if(iter.ascent > shCenter)
        {
            this.upBase = iter.ascent - shCenter;
        }
        else
        {
            this.upIter = shCenter - iter.ascent;
        }
    }

    var height = this.upBase + baseHeight;
    var ascent = this.upBase + baseAsc;

    this.upIter -= ascent;

    if( this.bNaryInline)
        this.dW = 0.17*PlH;
    else
        this.dW = 0.056*PlH;

    var width = baseWidth + iter.width + this.dW;
    width += this.GapLeft + this.GapRight;

    var ResultSize = new CMathSize();

    ResultSize.height = height;
    ResultSize.width  = width;
    ResultSize.ascent = ascent;

    return ResultSize;
};
CDegreeBase.prototype.GetSizeSubScript = function(oMeasure, Metric)
{
    var iter       = this.iterContent.size,
        baseAsc    = Metric.Asc,
        baseHeight = Metric.H,
        baseWidth  = Metric.W;

    var mgCtrPrp = this.Get_TxtPrControlLetter();
    var shCenter = this.ParaMath.GetShiftCenter(oMeasure, mgCtrPrp);

    var bTextElement = false,
        lastElem;


    if(!this.baseContent.IsJustDraw())
    {
        lastElem = this.baseContent.GetLastElement();

        var txtPrpControl = this.ParaMath.GetFirstRPrp();// нам нужен текстовые настройки для управляющих элементов без учета ArgSize, а это как раз будут текстовые настройки первого рана
        // если учтем ArgSize, то для вложенных дробей эта проверка на Run не сработает
        var BaseRun       = lastElem.Type == para_Math_Run && txtPrpControl.FontSize == lastElem.Get_CompiledPr(false).FontSize;
        bTextElement      = BaseRun || (lastElem.Type !== para_Math_Run && lastElem.IsJustDraw());
    }

    var height, ascent, descent;

    var PlH = 0.64*this.ParaMath.GetPlh(oMeasure, mgCtrPrp);

    if(bTextElement)
    {
        //var last = lastElem.size;
        var DownBaseline = 0.9*shCenter;


        if(iter.ascent - DownBaseline > 3/4*PlH)
            this.upIter = 1/4*PlH;
        else
            this.upIter = PlH + DownBaseline - iter.ascent;

        if(baseAsc > PlH)
        {
            this.upIter += baseAsc - PlH;
        }

        //this.upIter = base.ascent + DownBaseline - iter.ascent;

        var descentBase = baseHeight - baseAsc,
            descentIter = this.upIter + iter.height - baseAsc;

        descent = descentBase > descentIter ? descentBase : descentIter;
        ascent  = baseAsc;

        height = ascent + descent;
    }
    else
    {
        this.upIter = baseHeight + shCenter - iter.ascent;

        // ограничение для случая, когда аскент итератора >> высоты основания
        if(baseAsc - 1.5*shCenter > this.upIter)
            this.upIter = baseAsc - 1.5*shCenter;

        height = this.upIter + iter.height;
        ascent = baseAsc;
    }

    this.upIter -= ascent;

    if( this.bNaryInline)
        this.dW = 0.17*PlH;
    else
        this.dW = 0.056*PlH;

    var width = baseWidth + iter.width + this.dW;
    width += this.GapLeft + this.GapRight;

    var ResultSize = new CMathSize();

    ResultSize.height = height;
    ResultSize.width  = width;
    ResultSize.ascent = ascent;

    return ResultSize;
};
CDegreeBase.prototype.setPosition = function(pos, PRSA, Line, Range, Page)
{
    this.UpdatePosBound(pos, PRSA, Line, Range, Page);

    var CurLine = Line - this.StartLine;
    var CurRange = ( 0 === CurLine ? Range - this.StartRange : Range );

    if(this.bOneLine || CurLine == 0 && CurRange == 0)
        pos.x += this.BrGapLeft;

    if(this.bOneLine)
    {
        this.pos.x = pos.x;

        if(this.bInside === true)
        {
            this.pos.y = pos.y;
        }
        else
        {
            this.pos.y = pos.y - this.size.ascent;
        }

        var PosBase = new CMathPosition();
        PosBase.y = this.pos.y;
        PosBase.x = this.pos.x;

        PosBase.y += this.size.ascent - this.baseContent.size.ascent;

        if(!this.baseContent.IsJustDraw())
            PosBase.y += this.baseContent.size.ascent;

        this.baseContent.setPosition(PosBase, PRSA, Line, Range, Page);

        var PosIter = new CMathPosition();
        PosIter.x = this.pos.x + this.baseContent.size.width + this.dW;
        PosIter.y = this.pos.y + this.size.ascent + this.upIter + this.iterContent.size.ascent;

        this.iterContent.setPosition(PosIter, PRSA, Line, Range, Page);

        pos.x += this.size.width;
    }
    else
    {
        var Y = pos.y;

        this.baseContent.setPosition(pos, PRSA, Line, Range, Page);

        pos.x += this.dW;

        pos.y += this.upIter + this.iterContent.size.ascent;

        this.iterContent.setPosition(pos, PRSA, Line, Range, Page);

        pos.x += this.BrGapRight;

        pos.y = Y;
    }
};
CDegreeBase.prototype.getIterator = function()
{
    return this.iterContent;
};
CDegreeBase.prototype.getUpperIterator = function()
{
    return this.iterContent;
};
CDegreeBase.prototype.getLowerIterator = function()
{
    return this.iterContent;
};
CDegreeBase.prototype.getBase = function()
{
    return this.baseContent;
};
CDegreeBase.prototype.IsPlhIterator = function()
{
    return this.iterContent.IsPlaceholder();
};
CDegreeBase.prototype.setBase = function(base)
{
    this.baseContent = base;
};
CDegreeBase.prototype.setIterator = function(iterator)
{
    this.iterContent = iterator;
};

function CDegree(props, bInside)
{
    CDegree.superclass.constructor.call(this, props, bInside);

    this.Id = g_oIdCounter.Get_NewId();

    if(props !== null && typeof(props) !== "undefined")
        this.init(props);

    g_oTableId.Add( this, this.Id );
}
Asc.extendClass(CDegree, CDegreeBase);
CDegree.prototype.ClassType = historyitem_type_deg;
CDegree.prototype.kind      = MATH_DEGREE;
CDegree.prototype.init = function(props)
{
    this.Fill_LogicalContent(2);

    this.setProperties(props);
    this.fillContent();
};
CDegree.prototype.fillContent = function()
{
    this.NeedBreakContent(0);

    this.iterContent = this.Content[1];
    this.baseContent = this.Content[0];

    CDegree.superclass.fillContent.call(this);
};
CDegree.prototype.Document_UpdateInterfaceState = function(MathProps)
{
    MathProps.Type = c_oAscMathInterfaceType.Script;
    MathProps.Pr   = null;
};
CDegree.prototype.Recalculate_LineMetrics = function(PRS, ParaPr, _CurLine, _CurRange)
{
    var CurLine  = PRS.Line - this.StartLine;
    var CurRange = ( 0 === CurLine ? PRS.Range - this.StartRange : PRS.Range );

    if(CurLine == 0 && CurRange == 0)
    {
        this.Bounds.Reset();
    }

    if(this.bOneLine == false && this.baseContent.Math_Is_End( _CurLine, _CurRange))
    {
        this.iterContent.Recalculate_LineMetrics(PRS, ParaPr, _CurLine, _CurRange);
        this.baseContent.Recalculate_LineMetrics(PRS, ParaPr, _CurLine, _CurRange);

        var BoundBase = this.baseContent.Get_LineBound(_CurLine);
        var Bound;

        if(this.Pr.type === DEGREE_SUPERSCRIPT)
        {
            Bound = this.GetSizeSup(g_oTextMeasurer, BoundBase);
        }
        else
        {
            Bound = this.GetSizeSubScript(g_oTextMeasurer, BoundBase);
        }

        this.Bounds.UpdateMetrics(CurLine, Bound);
        PRS.ContentMetrics.UpdateMetrics(Bound);

        this.UpdatePRS(PRS, Bound);
    }
    else
    {
        CDegreeBase.prototype.Recalculate_LineMetrics.call(this, PRS, ParaPr, _CurLine, _CurRange);
    }

};
CDegree.prototype.setPosition = function(pos, PRSA, Line, Range, Page)
{
    var CurLine = Line - this.StartLine;
    var CurRange = ( 0 === CurLine ? Range - this.StartRange : Range );

    var EndPos   = this.protected_GetRangeEndPos(CurLine, CurRange);
    var Len = this.Content.length;

    if(this.bOneLine || (EndPos == Len - 1 && this.Content[EndPos].Math_Is_End( Line, Range)))
    {
        CDegree.superclass.setPosition.call(this, pos, PRSA, Line, Range, Page);
    }
    else
    {
        CMathBase.prototype.setPosition.call(this, pos, PRSA, Line, Range, Page);
    }
};

function CIterators(iterUp, iterDn)
{
    CIterators.superclass.constructor.call(this, true);

    this.lUp = 0;   // центр основания
    this.lD = 0;    // высота - центр основания
    this.upper = 0; // смещение сверху для позиции основания

    this.iterUp = iterUp;
    this.iterDn = iterDn;
}
Asc.extendClass(CIterators, CMathBase);
CIterators.prototype.init = function()
{
    this.setDimension(2, 1);
    this.elements[0][0] = this.iterUp;
    this.elements[1][0] = this.iterDn;
};
CIterators.prototype.PreRecalc = function(Parent, ParaMath, ArgSize, RPI, GapsInfo)
{
    this.Parent = Parent;
    this.ParaMath = ParaMath;

    this.ArgSize.SetValue(-1);

    var ArgSzIters = ArgSize.Copy();
    ArgSzIters.Merge(this.ArgSize);

    this.Set_CompiledCtrPrp(Parent, ParaMath, RPI);

    var RPI_ITER = RPI.Copy();
    RPI_ITER.bDecreasedComp = true;

    this.iterUp.PreRecalc(this, ParaMath, ArgSzIters, RPI_ITER);
    this.iterDn.PreRecalc(this, ParaMath, ArgSzIters, RPI_ITER);
};
CIterators.prototype.recalculateSize = function(oMeasure, dH, ascent)
{
    this.dH = dH;

    var iterUp = this.iterUp.size,
        iterDown = this.iterDn.size;

    this.size.ascent = ascent;
    this.size.height = iterUp.height + dH + iterDown.height;
    this.size.width  = iterUp.width > iterDown.width ? iterUp.width : iterDown.width;

};
CIterators.prototype.getUpperIterator = function()
{
    return this.elements[0][0];
};
CIterators.prototype.getLowerIterator = function()
{
    return this.elements[1][0];
};
CIterators.prototype.setUpperIterator = function(iterator)
{
    this.elements[0][0] = iterator;
};
CIterators.prototype.setLowerIterator = function(iterator)
{
    this.elements[1][0] = iterator;
};
CIterators.prototype.alignIterators = function(mcJc)
{
    this.alignment.wdt[0] = mcJc;
};

function CMathDegreeSubSupPr()
{
    this.type   = DEGREE_SubSup;
    this.alnScr = false;// не выровнены, итераторы идут в соответствии с наклоном буквы/мат. объекта
}

CMathDegreeSubSupPr.prototype.Set_FromObject = function(Obj)
{
    if (true === Obj.alnScr || 1 === Obj.alnScr)
        this.alnScr = true;
    else
        this.alnScr = false;

    if (DEGREE_SubSup === Obj.type || DEGREE_PreSubSup === Obj.type)
        this.type = Obj.type;
};

CMathDegreeSubSupPr.prototype.Copy = function()
{
    var NewPr = new CMathDegreeSubSupPr();

    NewPr.type   = this.type;
    NewPr.alnScr = this.alnScr;

    return NewPr;
};

CMathDegreeSubSupPr.prototype.Write_ToBinary = function(Writer)
{
    // Long : type
    // Bool : alnScr

    Writer.WriteLong(this.type);
    Writer.WriteBool(this.alnScr);
};

CMathDegreeSubSupPr.prototype.Read_FromBinary = function(Reader)
{
    // Long : type
    // Bool : alnScr

    this.type   = Reader.GetLong();
    this.alnScr = Reader.GetBool();
};


function CDegreeSubSupBase(props, bInside)
{
    CDegreeSubSupBase.superclass.constructor.call(this, bInside);

    this.bNaryInline = false;

    this.Pr = new CMathDegreeSubSupPr();

    this.baseContent = null;
    this.iters       = new CIterators(null, null);

    if(props !== null && typeof(props) !== "undefined")
        this.init(props);
}
Asc.extendClass(CDegreeSubSupBase, CMathBase);
CDegreeSubSupBase.prototype.init = function(props)
{
    this.setProperties(props);
    this.setDimension(1, 2);
};
CDegreeSubSupBase.prototype.fillContent = function()
{
    var oBase  = this.baseContent;
    var oIters = this.iters;

    this.setDimension(1, 2);

    oIters.init();

    oIters.lUp = 0;
    oIters.lD = 0;

    if(this.Pr.type == DEGREE_SubSup)
    {
        oIters.alignIterators(MCJC_LEFT);
        this.addMCToContent([oBase, oIters]);
    }
    else if(this.Pr.type == DEGREE_PreSubSup)
    {
        this.addMCToContent([oIters, oBase]);
        oIters.alignIterators(MCJC_RIGHT);
    }
};
CDegreeSubSupBase.prototype.PreRecalc = function(Parent, ParaMath, ArgSize, RPI, GapsInfo)
{
    this.bNaryInline = RPI.bNaryInline;

    CDegreeSubSupBase.superclass.PreRecalc.call(this, Parent, ParaMath, ArgSize, RPI, GapsInfo);
};
CDegreeSubSupBase.prototype.recalculateSize = function(oMeasure)
{
    var Metric = new CMathBoundsMeasures();
    Metric.UpdateMetrics(this.baseContent.size);
    Metric.UpdateWidth(this.baseContent.size.width);

    var ResultSize = this.GetSize(oMeasure, Metric);

    this.size.Set(ResultSize);
};
CDegreeSubSupBase.prototype.GetSize = function(oMeasure, Metric)
{
    var mgCtrPrp = this.Get_CompiledCtrPrp(); // Get_CompiledCtrPrp -  чтобы итераторы не разъезжались
    // половину ascent брать нельзя, т.к. черта дроби будет разделительной для верхнего и нижнего итератора => соответственно
    // если числитель меньше/больше знаменателя расположение итераторов у степени будет неправильным

    var iterUp   = this.iters.iterUp.size,
        iterDown = this.iters.iterDn.size;

    var baseAsc    = Metric.Asc,
        baseHeight = Metric.H,
        baseWidth  = Metric.W;

    var shCenter = this.ParaMath.GetShiftCenter(oMeasure, mgCtrPrp);
    shCenter *= 1.4;

    var PlH = 0.26*this.ParaMath.GetPlh(oMeasure, mgCtrPrp);

    var height, width, ascent, descent;

    var dH; // of Iterators
    var minGap;

    var TextElement = false;

    if(!this.baseContent.IsJustDraw())
    {
        var last = this.baseContent.GetLastElement();

        var BaseRun      = last.Type == para_Math_Run && mgCtrPrp.FontSize >= last.Get_CompiledPr(false).FontSize;
        TextElement  = BaseRun || (last.Type !== para_Math_Run && last.IsJustDraw());
    }


    if(TextElement)
    {
        minGap =  0.5*PlH;

        var DivBaseline = 3.034*PlH;
        var ascIters, dgrHeight;

        if(DivBaseline > minGap + iterDown.ascent + (iterUp.height - iterUp.ascent))
        {
            dH = DivBaseline - iterDown.ascent - (iterUp.height - iterUp.ascent);
        }
        else
        {
            dH = minGap;
        }

        var GapDown = PlH;

        ascIters = iterUp.height + dH + GapDown;
        dgrHeight = iterDown.height + iterUp.height + dH;

        ascent = ascIters > baseAsc ? ascIters : baseAsc;

        var dscIter = dgrHeight - ascIters,
            dscBase = baseHeight - baseAsc;

        descent = dscIter > dscBase ? dscIter : dscBase;
        height = ascent + descent;

        this.iters.recalculateSize(oMeasure, dH, ascIters /*ascent of Iterators*/);
    }
    else
    {
        minGap =  0.7*PlH;

        var lUpBase    = baseAsc - shCenter; // center of base
        var lDownBase  = baseHeight - lUpBase; // height - center of base


        var DescUpIter  = iterUp.height - iterUp.ascent + PlH;
        var AscDownIter = iterDown.ascent - PlH;

        var UpGap, DownGap;

        if(this.bNaryInline)
        {
            UpGap   = 0;
            DownGap = 0;
        }
        else
        {
            UpGap   = lUpBase > DescUpIter    ? lUpBase   - DescUpIter  : 0;           // расстояние от центра основания до верхнего итератора
            DownGap = lDownBase > AscDownIter ? lDownBase - AscDownIter : 0;           // расстояние от центра основания до нижнего итератора
        }

        if(UpGap + DownGap > minGap)
            dH = UpGap + DownGap;
        else
            dH = minGap;

        height = iterUp.height + dH + iterDown.height;
        ascent = iterUp.height + UpGap + shCenter;

        this.iters.recalculateSize(oMeasure, dH, ascent/*ascent of Iterators*/);
    }

    if( this.bNaryInline)
        this.dW = 0.42*PlH;
    else
        this.dW = 0.14*PlH;

    width  = this.iters.size.width + baseWidth + this.dW;
    width += this.GapLeft + this.GapRight;

    var ResultSize = new CMathSize();

    ResultSize.height = height;
    ResultSize.width  = width;
    ResultSize.ascent = ascent;

    return ResultSize;
};
CDegreeSubSupBase.prototype.getBase = function()
{
    return this.baseContent;
};
CDegreeSubSupBase.prototype.getUpperIterator = function()
{
    return this.iters.iterUp;
};
CDegreeSubSupBase.prototype.getLowerIterator = function()
{
    return this.iters.iterDn;
};
CDegreeSubSupBase.prototype.setBase = function(base)
{
    this.baseContent = base;
};
CDegreeSubSupBase.prototype.setUpperIterator = function(iterator)
{
    this.iters.iterUp = iterator;
};
CDegreeSubSupBase.prototype.setLowerIterator = function(iterator)
{
    this.iters.iterDn = iterator;
};


function CDegreeSubSup(props, bInside)
{
    CDegreeSubSup.superclass.constructor.call(this, props, bInside);

    this.Id = g_oIdCounter.Get_NewId();

    if(props !== null && typeof(props) !== "undefined")
        this.init(props);

    g_oTableId.Add( this, this.Id );
}
Asc.extendClass(CDegreeSubSup, CDegreeSubSupBase);
CDegreeSubSup.prototype.ClassType = historyitem_type_deg_subsup;
CDegreeSubSup.prototype.kind      = MATH_DEGREESubSup;
CDegreeSubSup.prototype.init = function(props)
{
    this.Fill_LogicalContent(3);

    this.setProperties(props);
    this.fillContent();
};
CDegreeSubSup.prototype.fillContent = function()
{
    this.NeedBreakContent(0);

     this.baseContent = this.Content[0];
     this.iters = new CIterators(this.Content[1], this.Content[2]);

    CDegreeSubSup.superclass.fillContent.call(this);
};
CDegreeSubSup.prototype.Recalculate_LineMetrics = function(PRS, ParaPr, _CurLine, _CurRange)
{
    var CurLine  = PRS.Line - this.StartLine;
    var CurRange = ( 0 === CurLine ? PRS.Range - this.StartRange : PRS.Range );

    if(CurLine == 0 && CurRange == 0)
    {
        this.Bounds.Reset();
    }

    if(this.bOneLine == false && this.Need_Iters(_CurLine, _CurRange))
    {
        this.Content[0].Recalculate_LineMetrics(PRS, ParaPr, _CurLine, _CurRange);
        this.Content[1].Recalculate_LineMetrics(PRS, ParaPr, _CurLine, _CurRange);
        this.Content[2].Recalculate_LineMetrics(PRS, ParaPr, _CurLine, _CurRange);

        var BoundBase = this.baseContent.Get_LineBound(_CurLine);

        var Bound = this.GetSize(g_oTextMeasurer, BoundBase);
        this.Bounds.UpdateMetrics(CurLine, Bound);
        PRS.ContentMetrics.UpdateMetrics(Bound);

        this.iters.Bounds.Reset();
        this.iters.Bounds.UpdateMetrics(0, this.iters.size);

        this.UpdatePRS(PRS, Bound);
    }
    else
    {
        CDegreeBase.prototype.Recalculate_LineMetrics.call(this, PRS, ParaPr, _CurLine, _CurRange);
    }

};
CDegreeSubSup.prototype.Recalculate_Range = function(PRS, ParaPr, Depth)
{
    this.bOneLine = PRS.bMath_OneLine;

    if(this.bOneLine === true)
    {
        CDegreeSubSup.superclass.Recalculate_Range.call(this, PRS, ParaPr, Depth);
    }
    else
    {
        var CurLine  = PRS.Line - this.StartLine;
        var CurRange = ( 0 === CurLine ? PRS.Range - this.StartRange : PRS.Range );

        var iterUp = this.iters.iterUp,
            iterDn = this.iters.iterDn;

        this.setDistance();

        var RangeStartPos = this.protected_AddRange(CurLine, CurRange),
            RangeEndPos = 0;

        this.VerifyWordLen(PRS);

        if(CurLine == 0 && CurRange == 0)
        {
            PRS.WordLen += this.BrGapLeft;
            this.baseContent.Recalculate_Reset(PRS.Range, PRS.Line);
        }

        PRS.Update_CurPos(0, Depth);
        PRS.bMath_OneLine  = false;

        if(this.Pr.type == DEGREE_SubSup) // baseContent, iters
            this.baseContent.Recalculate_Range(PRS, ParaPr, Depth+1);

        var bNeedUpdateIter = (this.Pr.type == DEGREE_SubSup && PRS.NewRange == false) || (CurLine == 0 && CurRange == 0 && this.Pr.type == DEGREE_PreSubSup);

        if(bNeedUpdateIter)
        {
            var PRS_Pos = PRS.CurPos.Copy();

            PRS.bMath_OneLine = true;

            var WWordLen = PRS.WordLen;

            this.iters.Recalculate_Range(PRS, ParaPr, Depth);

            var itersW = iterUp.size.width > iterDn.size.width ? iterUp.size.width : iterDn.size.width;

            PRS.CurPos.Set(PRS_Pos);
            PRS.WordLen = WWordLen + itersW + this.dW;
            PRS.Word = true;
        }

        PRS.bMath_OneLine  = false;

        if(this.Pr.type == DEGREE_PreSubSup) // iters, baseContent
            this.baseContent.Recalculate_Range(PRS, ParaPr, Depth+1);

        if(PRS.NewRange == false)
            PRS.WordLen += this.BrGapRight;



        this.protected_FillRange(CurLine, CurRange, RangeStartPos, RangeEndPos);

    }
};
CDegreeSubSup.prototype.Recalculate_Range_Width = function(PRSC, _CurLine, _CurRange)
{
    if(this.bOneLine == true)
    {
        CDegreeSubSup.superclass.Recalculate_Range_Width.call(this, PRSC, _CurLine, _CurRange);
    }
    else
    {
        var CurLine = _CurLine - this.StartLine;
        var CurRange = ( 0 === CurLine ? _CurRange - this.StartRange : _CurRange );

        var RangeW = PRSC.Range.W;

        if(CurLine == 0 && CurRange == 0)
        {
            PRSC.Range.W += this.BrGapLeft;
        }

        if(this.Pr.type == DEGREE_SubSup) // baseContent, iters
            this.baseContent.Recalculate_Range_Width(PRSC, _CurLine, _CurRange);

        if(this.Need_Iters(_CurLine, _CurRange))
        {
            var RangeW2 = PRSC.Range.W;

            this.iters.iterUp.Recalculate_Range_Width(PRSC, _CurLine, _CurRange);
            this.iters.iterDn.Recalculate_Range_Width(PRSC, _CurLine, _CurRange);

            this.iters.Bounds.SetWidth(0, this.iters.size.width);

            PRSC.Range.W = RangeW2 + this.iters.size.width + this.dW;
        }

        if(this.Pr.type == DEGREE_PreSubSup) // iters, baseContent
            this.baseContent.Recalculate_Range_Width(PRSC, _CurLine, _CurRange);

        if(this.baseContent.Math_Is_End(_CurLine, _CurRange))
        {
            PRSC.Range.W += this.BrGapRight;
        }

        this.Bounds.SetWidth(CurLine, PRSC.Range.W - RangeW);
    }
};
CDegreeSubSup.prototype.setPosition = function(pos, PRSA, Line, Range, Page)
{
    if(this.bOneLine)
    {
        CDegreeSubSup.superclass.setPosition.call(this, pos, PRSA, Line, Range, Page);
    }
    else
    {
        var CurLine  = Line - this.StartLine;
        var CurRange = ( 0 === CurLine ? Range - this.StartRange : Range );

        this.UpdatePosBound(pos, PRSA, Line, Range, Page);

        if(CurLine == 0 && CurRange == 0)
        {
            pos.x += this.BrGapLeft;
        }

        var PosIters = new CMathPosition();
        if(this.Pr.type == DEGREE_SubSup)
        {
            this.baseContent.setPosition(pos, PRSA, Line, Range, Page);

            if(this.baseContent.Math_Is_End(Line, Range))
            {
                PosIters.x = pos.x;
                PosIters.y = pos.y - this.iters.size.ascent;

                this.iters.setPosition(PosIters, PRSA, Line, Range, Page);

                pos.x += this.iters.size.width + this.dW + this.BrGapRight;
            }
        }
        else
        {
            if(CurLine == 0 && CurRange == 0)
            {
                PosIters.x = pos.x;
                PosIters.y = pos.y - this.iters.size.ascent;

                this.iters.setPosition(PosIters, PRSA, Line, Range, Page);

                pos.x += this.iters.size.width + this.dW;

            }

            this.baseContent.setPosition(pos, PRSA, Line, Range, Page);

            if(this.baseContent.Math_Is_End(Line, Range))
                pos.x += this.BrGapRight;
        }
    }
};
CDegreeSubSup.prototype.Draw_Elements = function(PDSE)
{
    this.baseContent.Draw_Elements(PDSE);

    if(this.Need_Iters(PDSE.Line, PDSE.Range))
        this.iters.Draw_Elements(PDSE);
};
CDegreeSubSup.prototype.Need_Iters = function(_CurLine, _CurRange)
{
    var CurLine = _CurLine - this.StartLine;
    var CurRange = ( 0 === CurLine ? _CurRange - this.StartRange : _CurRange );

    return  (this.Pr.type == DEGREE_SubSup && this.baseContent.Math_Is_End(_CurLine, _CurRange)) || (CurLine == 0 && CurRange == 0 && this.Pr.type == DEGREE_PreSubSup);
};
CDegreeSubSup.prototype.protected_GetRangeEndPos = function(CurLine, CurRange)
{
    var _CurLine  = CurLine + this.StartLine;
    var _CurRange = ( 0 === CurLine ? CurRange + this.StartRange : CurRange );

    return this.Need_Iters(_CurLine, _CurRange) ? 2 : 0;
};
CDegreeSubSup.prototype.Document_UpdateInterfaceState = function(MathProps)
{
    MathProps.Type = c_oAscMathInterfaceType.Script;
    MathProps.Pr   = null;
};
